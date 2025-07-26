import AsyncStorage from "@react-native-async-storage/async-storage";
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
  TouchableOpacity,
  View,
} from "react-native";

const AccountBalance = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [user, setUser] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const fetchBalance = async () => {
      try {
        const token = await AsyncStorage.getItem("access");
        const userData = await AsyncStorage.getItem("user");

        if (!token || !userData) {
          setError("User session expired or missing.");
          setLoading(false);
          return;
        }

        setUser(JSON.parse(userData));

        const response = await axios.get(`${apiUrl}/api/balance/`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        setBalance(response.data.balance);
      } catch (err) {
        console.error("Error fetching balance:", err);
        setError("Failed to fetch balance.");
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
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
          } catch (err) {
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <View style={styles.stickyHeader}>
        <ImageBackground
          source={require("./assets/sacco_logo.jpeg")}
          style={styles.headerBackground}
        >
          <Text style={styles.headerTitle}>Tomikal SHG</Text>
          <Text style={styles.accountText}>{user?.username || "..."}</Text>
          <Text style={styles.accountNumber}>
            {user ? user.id.toUpperCase() : "Loading..."}
          </Text>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>

      {/* ScrollView Content */}
      <ScrollView style={styles.scrollView}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text>Loading balance...</Text>
          </View>
        ) : error ? (
          <Text style={styles.errorText}>{error}</Text>
        ) : (
          <View style={styles.cardContainer}>
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Your Balance</Text>
              <Text style={[styles.amount, { marginTop: 10 }]}>
                Ksh {parseFloat(balance).toFixed(2)}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={styles.bottomButton}
            onPress={() => router.push("/dashboard")}
          >
            <Text style={styles.bottomButtonText}>Back to Dashboard</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },

  stickyHeader: { zIndex: 10 },
  headerBackground: {
    width: "100%",
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerTitle: { color: "#fff", fontSize: 24, fontWeight: "bold" },
  accountText: { color: "#fff", fontSize: 18 },
  accountNumber: { color: "#fff", fontSize: 16, marginTop: 5 },

  logoutButton: {
    position: "absolute",
    top: 40,
    right: 20,
    padding: 10,
    backgroundColor: "#e53e3e",
    borderRadius: 5,
  },
  logoutText: { color: "#fff", fontSize: 14 },

  scrollView: { flex: 1 },

  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },

  cardContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: "auto",
    justifyContent: "space-around",
    paddingVertical: 20,
  },
  card: {
    backgroundColor: "#f9f9f9",
    width: "90%",
    margin: 10,
    padding: 20,
    alignItems: "center",
    borderRadius: 10,
    elevation: 3,
  },
  cardTitle: { fontSize: 18, fontWeight: "bold", color: "#333" },
  amount: { fontSize: 32, color: "#4CAF50" },

  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },

  bottomContainer: { alignItems: "center", marginBottom: 20 },
  bottomButton: {
    marginTop: 20,
    width: "90%",
    padding: 15,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    alignItems: "center",
  },
  bottomButtonText: { color: "#fff", fontSize: 16 },
});

export default AccountBalance;
