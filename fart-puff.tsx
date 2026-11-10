import { useEffect, useRef } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';

/**
 * Animation plein écran : des nuages 💨 qui s'envolent en grossissant,
 * avec un message au centre. Appelle onDone à la fin.
 */
export function FartPuff({ message, onDone }: { message: string; onDone: () => void }) {
  const clouds = useRef(
    Array.from({ length: 9 }, () => ({
      v: new Animated.Value(0),
      x: (Math.random() - 0.5) * 260,
      delay: Math.random() * 350,
      size: 36 + Math.random() * 40,
    })),
  ).current;
  const text = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      ...clouds.map((c) =>
        Animated.timing(c.v, {
          toValue: 1,
          duration: 1300,
          delay: c.delay,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
      ),
      Animated.sequence([
        Animated.spring(text, { toValue: 1, friction: 4, useNativeDriver: true }),
        Animated.delay(700),
      ]),
    ]).start(() => onDone());
  }, []);

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      <View style={styles.center}>
        {clouds.map((c, i) => (
          <Animated.Text
            key={i}
            style={{
              position: 'absolute',
              fontSize: c.size,
              opacity: c.v.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 0] }),
              transform: [
                { translateX: c.v.interpolate({ inputRange: [0, 1], outputRange: [0, c.x] }) },
                { translateY: c.v.interpolate({ inputRange: [0, 1], outputRange: [80, -260] }) },
                { scale: c.v.interpolate({ inputRange: [0, 1], outputRange: [0.4, 1.8] }) },
              ],
            }}>
            💨
          </Animated.Text>
        ))}
        <Animated.View style={{ transform: [{ scale: text }], opacity: text }}>
          <Text style={styles.msg}>{message}</Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(123,192,67,0.25)',
  },
  msg: {
    fontSize: 30,
    fontWeight: '900',
    color: '#3B2A1A',
    textAlign: 'center',
    paddingHorizontal: 24,
    textShadowColor: '#fff',
    textShadowRadius: 8,
  },
});
