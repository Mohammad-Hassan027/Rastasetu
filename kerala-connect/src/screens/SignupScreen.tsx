import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RootStackParamList } from '@/types';
import ApiService from '@/services/api';
import { saveAuthToken, saveCurrentUser } from '@/utils/auth';
import { commonStyles, colors, spacing, fontSize } from '@/styles/common';

type SignupScreenNavigationProp = StackNavigationProp<RootStackParamList, 'Signup'>;

interface Props {
  navigation: SignupScreenNavigationProp;
}

const SignupScreen: React.FC<Props> = ({ navigation }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    fullName: '',
    confirmPassword: '',
  });
  const [loading, setLoading] = useState(false);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSignup = async () => {
    const { username, email, password, fullName, confirmPassword } = formData;

    if (!username || !email || !password || !fullName || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters long');
      return;
    }

    setLoading(true);
    try {
      const response = await ApiService.signup({
        username,
        email,
        password,
        fullName,
      });
      
      await saveAuthToken(response.token);
      await saveCurrentUser(response.user);
      
      Alert.alert('Success', 'Account created successfully!');
    } catch (error: any) {
      Alert.alert('Signup Failed', error.response?.data?.error || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    navigation.navigate('Login');
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.logoContainer}>
        <Text style={styles.logoText}>Kerala Connect</Text>
        <Text style={styles.tagline}>Join the Kerala Travel Community</Text>
      </View>

      <View style={styles.formContainer}>
        <Text style={commonStyles.title}>Create Account</Text>
        
        <View style={styles.inputContainer}>
          <Text style={commonStyles.label}>Full Name</Text>
          <TextInput
            style={commonStyles.input}
            value={formData.fullName}
            onChangeText={(value) => handleInputChange('fullName', value)}
            placeholder="Enter your full name"
            autoCapitalize="words"
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={commonStyles.label}>Username</Text>
          <TextInput
            style={commonStyles.input}
            value={formData.username}
            onChangeText={(value) => handleInputChange('username', value)}
            placeholder="Choose a username"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={commonStyles.label}>Email</Text>
          <TextInput
            style={commonStyles.input}
            value={formData.email}
            onChangeText={(value) => handleInputChange('email', value)}
            placeholder="Enter your email"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={commonStyles.label}>Password</Text>
          <TextInput
            style={commonStyles.input}
            value={formData.password}
            onChangeText={(value) => handleInputChange('password', value)}
            placeholder="Create a password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <View style={styles.inputContainer}>
          <Text style={commonStyles.label}>Confirm Password</Text>
          <TextInput
            style={commonStyles.input}
            value={formData.confirmPassword}
            onChangeText={(value) => handleInputChange('confirmPassword', value)}
            placeholder="Confirm your password"
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>

        <TouchableOpacity
          style={[commonStyles.button, loading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={loading}
        >
          <Text style={commonStyles.buttonText}>
            {loading ? 'Creating Account...' : 'Sign Up'}
          </Text>
        </TouchableOpacity>

        <View style={styles.loginContainer}>
          <Text style={styles.loginText}>Already have an account? </Text>
          <TouchableOpacity onPress={navigateToLogin}>
            <Text style={styles.loginLink}>Log in</Text>
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
    marginBottom: spacing.xl,
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
  loginContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.lg,
  },
  loginText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
  },
  loginLink: {
    fontSize: fontSize.md,
    color: colors.primary,
    fontWeight: '600',
  },
});

export default SignupScreen;