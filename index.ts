// Supabase Edge Function : envoie la notification « Oups je t'ai pété dessus !! xD »
// à la victime (un ami de l'utilisateur) via le service de push d'Expo.
//
// Déploiement : supabase functions deploy notify-victim
import { createClient } from 'npm:@supabase/supabase-js@2';

const MESSAGES = [
  "Oups je t'ai pété dessus !! xD",
  "Oups je t'ai pété dessus !! xD Retiens ta respiration…",
  "Oups je t'ai pété dessus !! xD C'était pas moi. Enfin si.",
];

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Non autorisé', { status: 401 });

    const { fart_id } = await req.json();
    if (!fart_id) return new Response('fart_id manquant', { status: 400 });

    // Client "admin" (clé service) pour lire le push_token de la victime
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // On vérifie qui appelle
    const jwt = authHeader.replace('Bearer ', '');
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user) return new Response('Non autorisé', { status: 401 });

    const { data: fart } = await admin
      .from('farts')
      .select('id, user_id, victim_id, kind, power')
      .eq('id', fart_id)
      .single();

    // Seul l'auteur du prout peut déclencher la notif, et seulement s'il y a une victime
    if (!fart || fart.user_id !== userData.user.id || !fart.victim_id) {
      return new Response('Rien à notifier', { status: 200 });
    }

    const [{ data: author }, { data: victim }] = await Promise.all([
      admin.from('profiles').select('display_name').eq('id', fart.user_id).single(),
      admin.from('profiles').select('push_token').eq('id', fart.victim_id).single(),
    ]);

    if (!victim?.push_token) return new Response('Victime sans notifications', { status: 200 });

    const body = MESSAGES[Math.floor(Math.random() * MESSAGES.length)];
    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        to: victim.push_token,
        title: `💨 ${author?.display_name ?? 'Un ami'}`,
        body,
        sound: 'default',
        data: { fart_id: fart.id },
      }),
    });

    return new Response(await res.text(), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(String(e), { status: 500 });
  }
});
