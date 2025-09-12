import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  Image,
  StyleSheet,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import ApiService from '@/services/api';
import { saveAuthToken, saveCurrentUser } from '@/utils/auth';
import { commonStyles, colors, spacing, fontSize } from '@/styles/common';

type LoginScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Login'>;

interface Props {
  navigation: LoginScreenNavigationProp;
}

const LoginScreen: React.FC<Props> = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.login({ email, password });
      await saveAuthToken(response.token);
      await saveCurrentUser(response.user);
      
      // Navigation will be handled by the auth state change in RootNavigator
    } catch (error: any) {
      Alert.alert('Login Failed', error.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const navigateToSignup = () => {
    navigation.navigate('Signup');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Kerala Connect</Text>
        <Text style={styles.tagline}>Discover Kerala, Connect with Travelers</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={commonStyles.title}>Welcome Back</Text>
        
        <View style={styles.inputContainer}>
          <Text style={commonStyles.label}>Email</Text>
          <TextInput
            style={commonStyles.input}
            value={email}
            onChangeText={setEmail}
            placeholder=\"Enter your email\"
            keyboardType=\"email-address\"
            autoCapitalize=\"none\"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={commonStyles.label}>Password</Text>
          <TextInput
            style={commonStyles.input}
            value={password}
            onChangeText={setPassword}
            placeholder=\"Enter your password\"
            secureTextEntry
            autoCapitalize=\"none\"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[commonStyles.button, loading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={loading}
        >
          <Text style={commonStyles.buttonText}>
            {loading ? 'Logging in...' : 'Login'}
          </Text>
        </TouchableOpacity>

        <View style={styles.signupContainer}>
          <Text style={styles.signupText}>Don't have an account? </Text>
          <TouchableOpacity onPress={navigateToSignup}>
            <Text style={styles.signupLink}>Sign up</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: colors.background,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  logoText: {
    fontSize: fontSize.xxxl,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: spacing.sm,
  },
  tagline: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  formContainer: {
    backgroundColor: colors.surface,
    padding: spacing.xl,
    borderRadius: 16,
    ...commonStyles.shadow,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  signupContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  signupText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  signupLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default LoginScreen;