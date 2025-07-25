import AsyncStorage from "@react-native-async-storage/async-storage";
import { Picker } from "@react-native-picker/picker";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

export default function CreateTransaction() {
  const [users, setUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState("");
  const [amount, setAmount] = useState("");
  const [transactionType, setTransactionType] = useState("deposit");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  useEffect(() => {
    const fetchData = async () => {
      try {
        const apiUrl = process.env.EXPO_PUBLIC_API_URL;
        const token = await AsyncStorage.getItem("access");

        const [userRes, usersRes] = await Promise.all([
          AsyncStorage.getItem("user"),
          axios.get(`${apiUrl}/api/users/`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ]);

        if (userRes) setUser(JSON.parse(userRes));
        setUsers(usersRes.data);
      } catch (error) {
        console.error(error);
        Alert.alert("Error", "Failed to load data.");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            router.replace("/login");
          } catch {
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  const handleSubmit = async () => {
    if (!selectedUser || !amount || isNaN(parseFloat(amount))) {
      Alert.alert(
        "Validation Error",
        "Please select a user and enter a valid amount."
      );
      return;
    }

    try {
      const apiUrl = process.env.EXPO_PUBLIC_API_URL;
      const token = await AsyncStorage.getItem("access");

      const payload = {
        user: selectedUser,
        amount: parseFloat(amount),
        transaction_type: transactionType,
      };

      await axios.post(`${apiUrl}/api/transactions/`, payload, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      Alert.alert("Success", "Transaction created and sent for approval.");
      router.push("/dashboard");
    } catch (error) {
      console.error(error);
      const msg =
        error.response?.data &&
        Object.values(error.response.data).flat().join("\n");
      Alert.alert("Error", msg || "Something went wrong.");
    }
  };

  const handleBack = () => router.push("/dashboard");

  return (
    <View style={styles.page}>
      {/* Sticky Header */}
      <View style={styles.stickyHeader}>
        <ImageBackground
          source={require("./assets/sacco_logo.jpeg")}
          style={styles.headerBackground}
        >
          <Text style={styles.headerTitle}>Tomikal SHG</Text>
          <Text style={styles.accountText}>{user?.username}</Text>
          <Text style={styles.accountNumber}>
            {user ? user.id.toUpperCase() : "Loading..."}
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>

      {/* Main Content */}
      <ScrollView contentContainerStyle={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#38a169" />
            <Text>Loading users...</Text>
          </View>
        ) : (
          <>
            <Text style={styles.title}>Create Transaction</Text>

            <Text style={styles.label}>Select User</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={selectedUser}
                onValueChange={(itemValue) => setSelectedUser(itemValue)}
              >
                <Picker.Item label="-- Select User --" value="" />
                {users.map((u) => (
                  <Picker.Item
                    key={u.id}
                    label={`${u.first_name} ${u.last_name} - ${u.phoneNumber}`}
                    value={u.id}
                  />
                ))}
              </Picker>
            </View>

            <Text style={styles.label}>Amount</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter amount"
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
            />

            <Text style={styles.label}>Transaction Type</Text>
            <View style={styles.pickerWrapper}>
              <Picker
                selectedValue={transactionType}
                onValueChange={(itemValue) => setTransactionType(itemValue)}
              >
                <Picker.Item label="Deposit" value="deposit" />
                <Picker.Item label="Withdrawal" value="withdrawal" />
                <Picker.Item label="Emergency Deposit" value="emergency" />
              </Picker>
            </View>

            <TouchableOpacity style={styles.button} onPress={handleSubmit}>
              <Text style={styles.buttonText}>Submit Transaction</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {/* Bottom Back Button */}
      <TouchableOpacity style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backButtonText}> Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  page: {
    flex: 1,
    backgroundColor: "#fff",
  },
  stickyHeader: {
    zIndex: 10,
  },
  headerBackground: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerTitle: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "bold",
  },
  accountText: {
    color: "#fff",
    fontSize: 18,
  },
  accountNumber: {
    color: "#fff",
    fontSize: 16,
    marginTop: 5,
  },
  logoutButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: "#e53e3e",
    borderRadius: 5,
  },
  logoutText: {
    color: "#fff",
    fontSize: 14,
  },

  container: {
    padding: 20,
    backgroundColor: "#fff",
    flexGrow: 1,
    paddingBottom: 120, // enough space for back button
  },
  loadingContainer: {
    marginTop: 50,
    alignItems: "center",
  },
  title: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
  },
  label: {
    fontWeight: "600",
    marginTop: 10,
  },
  pickerWrapper: {
    borderWidth: 1,
    borderColor: "#ccc",
    borderRadius: 8,
    marginVertical: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ccc",
    padding: 12,
    marginVertical: 10,
    borderRadius: 8,
  },
  button: {
    backgroundColor: "#38a169",
    padding: 15,
    borderRadius: 8,
    marginTop: 20,
    alignItems: "center",
  },
  buttonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },
  backButton: {
    position: "absolute",
    bottom: 40,
    left: 20,
    right: 20,
    backgroundColor: "#38a169",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 15,
  },
});
