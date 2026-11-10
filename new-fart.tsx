import * as Haptics from 'expo-haptics';
import * as Location from 'expo-location';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';

import { FartPuff } from '@/components/fart-puff';
import { Body, Button, Card, Chip, Label, Rating, styles } from '@/components/ui';
import { addFart, friends as loadFriends } from '@/lib/api';
import { playFart } from '@/lib/sounds';
import { colors } from '@/lib/theme';
import { KINDS, type FartKind, type FriendRow } from '@/lib/types';

const OUPS = "Oups je t'ai pété dessus !! xD";

export default function NewFart() {
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locError, setLocError] = useState<string | null>(null);
  const [kind, setKind] = useState<FartKind>('classique');
  const [power, setPower] = useState(3);
  const [smell, setSmell] = useState(3);
  const [discretion, setDiscretion] = useState(3);
  const [note, setNote] = useState('');

  // Option « Oups je t'ai pété dessus !! xD »
  const [oups, setOups] = useState(false);
  const [victimMode, setVictimMode] = useState<'ami' | 'nom'>('ami');
  const [friendList, setFriendList] = useState<FriendRow[]>([]);
  const [victimId, setVictimId] = useState<string | null>(null);
  const [victimName, setVictimName] = useState('');

  const [saving, setSaving] = useState(false);
  const [puff, setPuff] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { granted } = await Location.requestForegroundPermissionsAsync();
      if (!granted) {
        setLocError("Autorise la localisation pour placer ton prout sur la carte.");
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
    })().catch((e) => setLocError(String(e?.message ?? e)));

    loadFriends()
      .then((rows) => setFriendList(rows.filter((r) => r.status === 'accepted')))
      .catch(() => {});
  }, []);

  function pickKind(k: FartKind) {
    setKind(k);
    playFart(k); // aperçu du son
  }

  async function save() {
    if (!coords) return;
    if (oups && victimMode === 'ami' && !victimId) {
      Alert.alert('Qui est la victime ?', 'Choisis un ami, ou passe en mode « Juste un nom ».');
      return;
    }
    if (oups && victimMode === 'nom' && !victimName.trim()) {
      Alert.alert('Qui est la victime ?', 'Écris son nom.');
      return;
    }
    setSaving(true);
    try {
      await addFart({
        lat: coords.lat,
        lng: coords.lng,
        kind,
        power,
        smell,
        discretion,
        note: note.trim() || null,
        victim_id: oups && victimMode === 'ami' ? victimId : null,
        victim_name: oups && victimMode === 'nom' ? victimName.trim() : null,
      });
      playFart(kind);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (oups && victimMode === 'nom') {
        // Partage du message par SMS / WhatsApp / etc.
        await Share.share({
          message: `${victimName.trim()}… ${OUPS} 💨\n(${KINDS.find((k) => k.value === kind)?.label}, puissance ${power}/5)\n— envoyé depuis Prout Map`,
        });
      }

      const victimLabel =
        oups && victimMode === 'ami'
          ? friendList.find((f) => f.friend_id === victimId)?.display_name
          : victimName.trim();
      setPuff(oups ? `${victimLabel}…\n${OUPS}` : 'Prout enregistré ! 💨');
    } catch (e: any) {
      Alert.alert('Oups (le vrai)', e?.message ?? String(e));
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16, paddingBottom: 48 }}>
        <Card>
          <Label>Position</Label>
          {coords ? (
            <Body>📍 Ici même ({coords.lat.toFixed(4)}, {coords.lng.toFixed(4)})</Body>
          ) : locError ? (
            <Body style={{ color: colors.danger }}>{locError}</Body>
          ) : (
            <ActivityIndicator style={{ alignSelf: 'flex-start', marginTop: 6 }} />
          )}
        </Card>

        <Card>
          <Label>Type</Label>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
            {KINDS.map((k) => (
              <Chip
                key={k.value}
                label={`${k.emoji} ${k.label}`}
                selected={kind === k.value}
                onPress={() => pickKind(k.value)}
              />
            ))}
          </View>
        </Card>

        <Card>
          <Rating label="Puissance" value={power} onChange={setPower} emoji="💪" />
          <Rating label="Odeur" value={smell} onChange={setSmell} emoji="🤢" />
          <Rating label="Discrétion" value={discretion} onChange={setDiscretion} emoji="🥷" />
        </Card>

        <Card style={oups && { borderColor: colors.accent, borderWidth: 2 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 17, fontWeight: '800', color: colors.text, flex: 1 }}>
              😈 {OUPS}
            </Text>
            <Switch
              value={oups}
              onValueChange={(v) => {
                setOups(v);
                if (v) Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
              }}
              trackColor={{ true: colors.accent }}
            />
          </View>

          {oups && (
            <View style={{ marginTop: 12, gap: 10 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <Chip label="👯 Un ami de l'appli" selected={victimMode === 'ami'} onPress={() => setVictimMode('ami')} />
                <Chip label="✍️ Juste un nom" selected={victimMode === 'nom'} onPress={() => setVictimMode('nom')} />
              </View>

              {victimMode === 'ami' ? (
                friendList.length === 0 ? (
                  <Body style={{ color: colors.muted }}>
                    Pas encore d'amis dans l'appli. Ajoute-les avec leur code dans l'onglet Amis, ou
                    utilise « Juste un nom ».
                  </Body>
                ) : (
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {friendList.map((f) => (
                      <Chip
                        key={f.friend_id}
                        label={f.display_name}
                        selected={victimId === f.friend_id}
                        onPress={() => setVictimId(f.friend_id)}
                      />
                    ))}
                  </View>
                )
              ) : (
                <TextInput
                  style={styles.input}
                  placeholder="Nom de la victime"
                  placeholderTextColor={colors.muted}
                  value={victimName}
                  onChangeText={setVictimName}
                  maxLength={60}
                />
              )}
              <Body style={{ color: colors.muted, fontSize: 13 }}>
                {victimMode === 'ami'
                  ? 'Ton ami recevra une notification et le prout apparaîtra sur sa carte.'
                  : "Tu pourras lui envoyer le message par SMS, WhatsApp…"}
              </Body>
            </View>
          )}
        </Card>

        <Card>
          <Label>Note (facultatif)</Label>
          <TextInput
            style={[styles.input, { marginTop: 8, minHeight: 70, textAlignVertical: 'top' }]}
            placeholder="Contexte, ambiance, témoins…"
            placeholderTextColor={colors.muted}
            value={note}
            onChangeText={setNote}
            multiline
            maxLength={280}
          />
        </Card>

        <Button
          title={oups ? '😈 Lâcher sur la victime' : '💨 Enregistrer'}
          onPress={save}
          loading={saving}
          disabled={!coords}
        />
      </ScrollView>

      {puff && <FartPuff message={puff} onDone={() => router.back()} />}
    </KeyboardAvoidingView>
  );
}
