import AsyncStorage from "@react-native-async-storage/async-storage";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

dayjs.extend(relativeTime);

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

const PendingTransactionsScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approvingId, setApprovingId] = useState(null);
  const [user, setUser] = useState(null);
  const navigation = useNavigation();

  const loadTokenAndFetch = async () => {
    try {
      const storedToken = await AsyncStorage.getItem("access");
      const storedUser = await AsyncStorage.getItem("user");
      if (!storedToken || !storedUser) {
        Alert.alert("Error", "Authentication token or user data not found.");
        return;
      }
      setUser(JSON.parse(storedUser));
      await fetchPendingTransactions(storedToken);
    } catch (err) {
      console.error("Token error:", err);
      Alert.alert("Error", "Could not load token or user.");
    }
  };

  const fetchPendingTransactions = async (authToken) => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${apiUrl}/api/transactions/?status=pending`,
        {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        }
      );
      const pending = response.data.filter(
        (t) => t.status.toLowerCase() === "pending"
      );
      setTransactions(pending);
    } catch (error) {
      console.error("Fetch error:", error);
      Alert.alert("Error", "Failed to fetch transactions.");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (transactionId, action) => {
    try {
      setApprovingId(transactionId);
      const token = await AsyncStorage.getItem("access");
      if (!token) throw new Error("Token missing.");

      await axios.put(
        `${apiUrl}/api/transactions/${transactionId}/`,
        { action },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      Alert.alert("Success", `Transaction ${action}d.`);
      setTransactions((prev) => prev.filter((t) => t.id !== transactionId));
    } catch (error) {
      console.error(`${action} error:`, error?.response || error.message);
      Alert.alert(
        "Error",
        error?.response?.data?.error || `Failed to ${action} transaction.`
      );
    } finally {
      setApprovingId(null);
    }
  };

  const handleLogout = async () => {
    await AsyncStorage.clear();
    navigation.navigate("login");
  };

  useEffect(() => {
    loadTokenAndFetch();
  }, []);

  const renderItem = ({ item }) => {
    const user = item.user;
    const timeAgo = dayjs(item.date).fromNow();

    return (
      <View style={styles.row}>
        <View style={styles.cell}>
          <Text>
            {user.first_name} {user.last_name}
          </Text>
        </View>
        <View style={[styles.cell, { width: 90 }]}>
          <Text>{user.phoneNumber}</Text>
        </View>
        <View style={[styles.cell, { width: 80 }]}>
          <Text>KES {parseFloat(item.amount).toLocaleString()}</Text>
        </View>
        <View style={styles.cell}>
          <Text>{timeAgo}</Text>
        </View>
        <View
          style={[styles.cell, { width: 150, flexDirection: "row", gap: 6 }]}
        >
          <TouchableOpacity
            onPress={() => handleAction(item.id, "approve")}
            disabled={approvingId === item.id}
            style={[styles.actionButton, { backgroundColor: "#2E7D32" }]}
          >
            <Text style={styles.actionText}>
              {approvingId === item.id ? "..." : "Approve"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleAction(item.id, "reject")}
            disabled={approvingId === item.id}
            style={[styles.actionButton, { backgroundColor: "#C62828" }]}
          >
            <Text style={styles.actionText}>
              {approvingId === item.id ? "..." : "Reject"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={{ flex: 1 }}>
      <View style={styles.stickyHeader}>
        <ImageBackground
          source={require("./assets/sacco_logo.jpeg")}
          style={styles.headerBackground}
        >
          <Text style={styles.headerTitle}>Tomikal SHG</Text>
          <Text style={styles.accountText}>{user?.username}</Text>
          <Text style={styles.accountNumber}>
            {user ? user.id.toUpperCase() : "waiting"}
          </Text>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#2E7D32" />
          <Text>Loading transactions...</Text>
        </View>
      ) : transactions.length === 0 ? (
        <View style={styles.centered}>
          <Text>No pending transactions found.</Text>
        </View>
      ) : (
        <ScrollView horizontal style={{ flex: 1 }}>
          <View>
            <View style={styles.tableHeader}>
              <Text style={styles.headerCell}>Name</Text>
              <Text style={[styles.headerCell, { width: 90 }]}>Phone</Text>
              <Text style={[styles.headerCell, { width: 80 }]}>Amount</Text>
              <Text style={styles.headerCell}>Date</Text>
              <Text style={[styles.headerCell, { width: 150 }]}>Actions</Text>
            </View>
            <FlatList
              data={transactions}
              keyExtractor={(item) => item.id.toString()}
              renderItem={renderItem}
            />
          </View>
        </ScrollView>
      )}

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.navigate("dashboard")}
      >
        <Text style={styles.backButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

export default PendingTransactionsScreen;

const styles = StyleSheet.create({
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
    padding: 8,
    backgroundColor: "#E53935",
    borderRadius: 6,
  },
  logoutText: {
    color: "#fff",
    fontWeight: "bold",
  },

  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  tableHeader: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#ddd",
  },
  headerCell: {
    fontWeight: "bold",
    width: 120,
    padding: 4,
    textAlign: "left",
  },
  row: {
    flexDirection: "row",
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  cell: {
    width: 120,
    justifyContent: "center",
    padding: 4,
  },
  actionButton: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 4,
  },
  actionText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 12,
  },
  backButton: {
    position: "absolute",
    bottom: 40,
    alignSelf: "center",
    backgroundColor: "#1976D2",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
