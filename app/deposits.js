import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Picker } from "@react-native-picker/picker";
import { useNavigation } from "@react-navigation/native";
import axios from "axios";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ImageBackground,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

const DepositsSharesScreen = () => {
  const [transactions, setTransactions] = useState([]);
  const [filteredTransactions, setFilteredTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transactionType, setTransactionType] = useState("all");
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [user, setUser] = useState(null);
  const navigation = useNavigation();
  const { width } = useWindowDimensions();

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        const token = await AsyncStorage.getItem("access");
        const userData = await AsyncStorage.getItem("user");

        if (!token) {
          Alert.alert("Error", "Unable to fetch access token.");
          return;
        }
        setUser(JSON.parse(userData));
        const { data } = await axios.get(
          `${process.env.EXPO_PUBLIC_API_URL}/api/transactions/`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        setTransactions(data);
        setFilteredTransactions(data);
      } catch (error) {
        console.error("Error fetching transactions:", error);
        Alert.alert("Error", "Something went wrong. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, []);

  useEffect(() => {
    let filtered = [...transactions];

    if (transactionType !== "all") {
      filtered = filtered.filter(
        (item) => item.transaction_type === transactionType
      );
    }

    if (startDate) {
      filtered = filtered.filter((item) => new Date(item.date) >= startDate);
    }

    if (endDate) {
      filtered = filtered.filter((item) => new Date(item.date) <= endDate);
    }

    setFilteredTransactions(filtered);
  }, [transactionType, startDate, endDate]);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to logout?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            router.replace("/login"); // Redirect to login screen
          } catch (err) {
            Alert.alert("Error", "Failed to logout");
          }
        },
      },
    ]);
  };

  const renderHeader = () => (
    <View style={styles.stickyHeader}>
      {/* Sticky Header */}
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
  );

  const renderFilters = () => (
    <View style={styles.filterContainer}>
      <Text style={styles.filterLabel}>Transaction Type:</Text>
      <Picker
        selectedValue={transactionType}
        onValueChange={(value) => setTransactionType(value)}
        style={styles.picker}
      >
        <Picker.Item label="All" value="all" />
        <Picker.Item label="Deposit" value="deposit" />
        <Picker.Item label="Withdrawal" value="withdrawal" />
      </Picker>

      <View style={styles.dateRow}>
        <TouchableOpacity
          onPress={() => setShowStartPicker(true)}
          style={styles.datePickerButton}
        >
          <Text style={styles.datePickerText}>
            {startDate ? startDate.toDateString() : "Start Date"}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setShowEndPicker(true)}
          style={styles.datePickerButton}
        >
          <Text style={styles.datePickerText}>
            {endDate ? endDate.toDateString() : "End Date"}
          </Text>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowStartPicker(false);
            if (selectedDate) setStartDate(selectedDate);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate || new Date()}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowEndPicker(false);
            if (selectedDate) setEndDate(selectedDate);
          }}
        />
      )}
    </View>
  );

  const renderTable = () => (
    <ScrollView horizontal>
      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={styles.tableHeaderCell}>Type</Text>
          <Text style={styles.tableHeaderCell}>Amount</Text>
          <Text style={styles.tableHeaderCell}>Date</Text>
        </View>
        {filteredTransactions.map((item) => (
          <View key={item.id} style={styles.tableRow}>
            <Text style={styles.tableCell}>{item.transaction_type}</Text>
            <Text style={styles.tableCell}>KES {item.amount}</Text>
            <Text style={styles.tableCell}>
              {new Date(item.date).toLocaleDateString()}{" "}
              {new Date(item.date).toLocaleTimeString()}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderBottomBar = () => (
    <View style={styles.bottomBar}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}> Back to Dashboard</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4CAF50" />
      </View>
    );
  }

  return (
    <View style={styles.pageContainer}>
      {renderHeader()}
      <ScrollView contentContainerStyle={styles.content}>
        {renderFilters()}
        {renderTable()}
      </ScrollView>
      {renderBottomBar()}
    </View>
  );
};
const styles = StyleSheet.create({
  // Core container
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },

  // Sticky header with image background
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

  // Scroll view area
  scrollView: {
    flex: 1,
  },

  // Filter UI
  filterContainer: {
    padding: 15,
    backgroundColor: "#f2f2f2",
    borderBottomColor: "#ccc",
    borderBottomWidth: 1,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 5,
  },
  picker: {
    backgroundColor: "#fff",
    borderRadius: 5,
    marginBottom: 10,
  },
  dateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  datePickerButton: {
    flex: 1,
    padding: 10,
    marginRight: 10,
    backgroundColor: "#fff",
    borderRadius: 5,
    alignItems: "center",
  },
  datePickerText: {
    color: "#333",
  },

  // Table area
  table: {
    padding: 10,
  },
  tableHeader: {
    flexDirection: "row",
    borderBottomWidth: 2,
    borderColor: "#4CAF50",
    paddingBottom: 5,
    marginBottom: 5,
  },
  tableHeaderCell: {
    minWidth: 120,
    fontWeight: "bold",
    textAlign: "left",
    color: "#333",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderColor: "#eee",
    paddingVertical: 8,
  },
  tableCell: {
    minWidth: 120,
    textAlign: "left",
    color: "#444",
  },

  // Cards (if used elsewhere)
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
  cardTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
  },
  amount: {
    fontSize: 32,
    color: "#4CAF50",
  },

  // Error text
  errorText: {
    fontSize: 18,
    color: "red",
    textAlign: "center",
    marginTop: 20,
  },

  // Bottom section (footer bar)
  bottomBar: {
    padding: 15,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  bottomContainer: {
    alignItems: "center",
    marginBottom: 20,
  },
  bottomButton: {
    marginTop: 20,
    width: "90%",
    padding: 15,
    backgroundColor: "#4CAF50",
    borderRadius: 10,
    alignItems: "center",
  },
  bottomButtonText: {
    color: "#fff",
    fontSize: 16,
  },
  backButton: {
    backgroundColor: "#4CAF50",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    width: "90%",
  },
  backButtonText: {
    color: "#fff",
    fontSize: 16,
  },

  // Loading overlay
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Ensure content space before bottom button
  content: {
    paddingBottom: 100,
  },
});

export default DepositsSharesScreen;
