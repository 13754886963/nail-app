import { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { Colors } from '../constants/colors';

export function BouncingDots({ visible = true }: { visible?: boolean }) {
  const anims = useRef([
    new Animated.Value(0),
    new Animated.Value(0),
    new Animated.Value(0),
  ]).current;

  useEffect(() => {
    const animations = anims.map((anim, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(i * 150),
          Animated.timing(anim, { toValue: 1, duration: 280, useNativeDriver: true }),
          Animated.timing(anim, { toValue: 0, duration: 280, useNativeDriver: true }),
          Animated.delay(560 - i * 150),
        ])
      )
    );
    animations.forEach((a) => a.start());
    return () => animations.forEach((a) => a.stop());
  }, []);

  // Keep views mounted at all times so native animations never stop.
  // Use height:0 to hide instead of unmounting.
  return (
    <View style={visible ? styles.wrap : styles.hidden}>
      {anims.map((anim, i) => (
        <Animated.View
          key={i}
          style={[
            styles.dot,
            {
              transform: [{ translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -7] }) }],
              opacity: anim.interpolate({ inputRange: [0, 1], outputRange: [0.35, 1] }),
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', paddingVertical: 12, gap: 6 },
  hidden: { height: 0, overflow: 'hidden' },
  dot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: Colors.primary },
});
