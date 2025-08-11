import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
} from "react-native";

export default function Login() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [isButtonPressed, setIsButtonPressed] = useState(false);

  const handleLogin = async () => {
    const apiUrl = process.env.EXPO_PUBLIC_API_URL;
    setIsButtonPressed(true);

    if (!username || !password) {
      Alert.alert("Error", "Please enter both username and password.");
      setIsButtonPressed(false);
      return;
    }

    try {
      const response = await axios.post(
        `${apiUrl}/api/login/`,
        { username, password },
        { headers: { "Content-Type": "application/json" } }
      );

      const token = response.data.tokens;
      if (token?.access) {
        await AsyncStorage.setItem("access", token.access);
        await AsyncStorage.setItem("user", JSON.stringify(response.data.user));
        router.replace("/dashboard");
      } else {
        throw new Error("Access token not found in the response.");
      }
    } catch (error) {
      const message = error?.response?.data
        ? Object.values(error.response.data).flat().join("\n")
        : "Something went wrong. Please try again.";
      Alert.alert("Login Error", message);
    } finally {
      setIsButtonPressed(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContainer}
        keyboardShouldPersistTaps="handled"
      >
        {/* Logo Image */}
        <Image
          source={require("./assets/sacco_logo.jpeg")}
          style={styles.logo}
          resizeMode="cover"
        />

        <Text style={styles.title}>Login</Text>

        <TextInput
          style={styles.input}
          placeholder="Phone Number"
          value={username}
          onChangeText={setUsername}
        />

        <TextInput
          style={styles.input}
          placeholder="Password"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
        />

        <TouchableOpacity
          style={[
            styles.button,
            isButtonPressed ? styles.buttonPressed : styles.buttonNormal,
          ]}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>
            {isButtonPressed ? "Processing..." : "Login"}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/forgot-password")}
          style={styles.forgotLinkContainer}
        >
          <Text style={styles.forgotLinkText}>Forgot Password?</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push("/register")}
          style={styles.registerLinkContainer}
        >
          <Text style={styles.registerLinkText}>
            Don't have an account? Register instead
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  scrollContainer: {
    flexGrow: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  logo: {
    width: 200,
    height: 160,
    borderRadius: 15, // Fully round
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#ccc",
    overflow: "hidden",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 20,
  },
  input: {
    width: "80%",
    padding: 10,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  forgotLinkContainer: {
    width: "80%",
    alignItems: "flex-end",
    marginBottom: 10,
  },
  forgotLinkText: {
    color: "#1e90ff",
    fontSize: 14,
    textDecorationLine: "underline",
  },
  button: {
    width: "80%",
    padding: 15,
    marginVertical: 10,
    borderRadius: 10,
    alignItems: "center",
  },
  buttonNormal: {
    backgroundColor: "#38a169",
  },
  buttonPressed: {
    backgroundColor: "#e53e3e",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  registerLinkContainer: {
    marginTop: 20,
  },
  registerLinkText: {
    color: "#1e90ff",
    textDecorationLine: "underline",
    fontSize: 16,
  },
});
