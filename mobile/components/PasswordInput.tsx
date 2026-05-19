import { useState, forwardRef } from 'react';
import {
  View, TextInput, TouchableOpacity, StyleSheet,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/colors';

type Props = Omit<TextInputProps, 'secureTextEntry'> & {
  inputStyle?: object;
};

export const PasswordInput = forwardRef<TextInput, Props>(
  ({ inputStyle, style, ...props }, ref) => {
    const [visible, setVisible] = useState(false);
    return (
      <View style={[styles.wrap, style]}>
        <TextInput
          ref={ref}
          {...props}
          secureTextEntry={!visible}
          style={[styles.input, inputStyle]}
        />
        <TouchableOpacity
          style={styles.eyeBtn}
          onPress={() => setVisible((v) => !v)}
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={visible ? 'eye-outline' : 'eye-off-outline'}
            size={20}
            color={Colors.textSecondary}
          />
        </TouchableOpacity>
      </View>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 12,
    backgroundColor: Colors.surface,
    paddingRight: 12,
  },
  input: {
    flex: 1,
    height: 52,
    paddingHorizontal: 16,
    fontSize: 16,
    color: Colors.text,
  },
  eyeBtn: {
    padding: 4,
  },
});
