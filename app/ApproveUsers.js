import AsyncStorage from "@react-native-async-storage/async-storage";
import axios from "axios";
import { useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  ImageBackground,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const ApproveUsers = () => {
  const apiUrl = process.env.EXPO_PUBLIC_API_URL;
  const orgName = process.env.EXPO_PUBLIC_ORG_NAME || "Organization";

  const [headerLoading, setHeaderLoading] = useState(true);
  const [userDetails, setUserDetails] = useState(null);
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [error, setError] = useState(null);

  const router = useRouter();

  // Load header info from AsyncStorage
  useEffect(() => {
    const loadHeaderData = async () => {
      try {
        const storedUser = await AsyncStorage.getItem("user");
        if (storedUser) {
          setUserDetails(JSON.parse(storedUser));
        }
      } catch (err) {
        console.error("Error loading user details:", err);
      } finally {
        setHeaderLoading(false);
      }
    };
    loadHeaderData();
  }, []);

  // Load pending users
  useEffect(() => {
    if (!headerLoading) {
      const fetchUsers = async () => {
        try {
          const token = await AsyncStorage.getItem("access");
          if (!token) {
            setError("Session expired. Please log in again.");
            setLoadingUsers(false);
            return;
          }

          const response = await axios.get(`${apiUrl}/api/users/pending/`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const apiData = response.data;
          if (Array.isArray(apiData)) {
            setUsers(apiData);
          } else if (Array.isArray(apiData.results)) {
            setUsers(apiData.results);
          } else {
            setUsers([]);
          }
        } catch (err) {
          console.error("Error fetching users:", err);
          setError("Failed to load user list.");
        } finally {
          setLoadingUsers(false);
        }
      };

      setTimeout(fetchUsers, 300);
    }
  }, [headerLoading]);

  const handleAction = async (userId, actionType) => {
    try {
      const token = await AsyncStorage.getItem("access");
      if (!token) {
        Alert.alert("Error", "Session expired. Please log in again.");
        return;
      }

      await axios.patch(
        `${apiUrl}/api/users/approve/${userId}/`,
        { action: actionType },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      // Remove user from list after action
      setUsers((prev) => prev.filter((user) => user.id !== userId));
    } catch (err) {
      console.error(`Error performing ${actionType} action:`, err);
      Alert.alert("Error", `Failed to ${actionType} user.`);
    }
  };

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          await AsyncStorage.clear();
          router.replace("/login");
        },
      },
    ]);
  };

  const renderUser = ({ item }) => (
    <View style={styles.row}>
      <Text style={[styles.cell, { flex: 3 }]}>
        {item.first_name} {item.last_name}
      </Text>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: "green" }]}
        onPress={() => handleAction(item.id, "approve")}
      >
        <Text style={styles.actionText}>Approve</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.actionButton, { backgroundColor: "red" }]}
        onPress={() => handleAction(item.id, "reject")}
      >
        <Text style={styles.actionText}>Reject</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Sticky Header */}
      <View style={styles.stickyHeader}>
        <ImageBackground
          source={require("./assets/sacco_logo.jpeg")}
          style={styles.headerBackground}
        >
          <Text style={styles.headerTitle}>{orgName}</Text>
          {headerLoading ? (
            <ActivityIndicator
              size="small"
              color="#fff"
              style={{ marginTop: 5 }}
            />
          ) : (
            <>
              <Text style={styles.accountText}>
                {userDetails
                  ? `${userDetails.first_name} ${userDetails.last_name}`
                  : "No Name"}
              </Text>
              <Text style={styles.accountNumber}>
                {userDetails?.phoneNumber || "No Phone"}
              </Text>
            </>
          )}
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </ImageBackground>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.headerCell, { flex: 3 }]}>Name</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Approve</Text>
        <Text style={[styles.headerCell, { flex: 1 }]}>Reject</Text>
      </View>

      {/* User List */}
      {loadingUsers ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4CAF50" />
          <Text>Loading users...</Text>
        </View>
      ) : error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : users.length === 0 ? (
        <View style={styles.loadingContainer}>
          <Text>No pending users found.</Text>
        </View>
      ) : (
        <FlatList
          data={users}
          keyExtractor={(item) => item.id.toString()}
          renderItem={renderUser}
          contentContainerStyle={{ paddingBottom: 80 }}
        />
      )}

      {/* Sticky Bottom Button */}
      <TouchableOpacity
        style={styles.stickyButton}
        onPress={() => router.push("/dashboard")}
      >
        <Text style={styles.stickyButtonText}>Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  stickyHeader: { zIndex: 10 },
  headerBackground: {
    width: "100%",
    height: 200,
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
    backgroundColor: "#e53e3e",
    borderRadius: 5,
  },
  logoutText: { color: "#fff", fontSize: 14 },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#f1f1f1",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: "#ddd",
  },
  headerCell: { fontWeight: "bold", textAlign: "center" },
  row: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 10,
    alignItems: "center",
  },
  cell: { textAlign: "center", paddingHorizontal: 5 },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 5,
    alignItems: "center",
    marginHorizontal: 2,
  },
  actionText: { color: "#fff", fontWeight: "bold" },
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 20,
  },
  errorText: {
    fontSize: 16,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },
  stickyButton: {
    position: "absolute",
    bottom: 30,
    left: 20,
    right: 20,
    backgroundColor: "green",
    paddingVertical: 15,
    borderRadius: 8,
    alignItems: "center",
  },
  stickyButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
  },
});

export default ApproveUsers;
