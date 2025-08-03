import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { View, Text, Button, FlatList, TouchableOpacity, StyleSheet } from 'react-native';

interface Device {
  id: string;
  name: string;
  traffic: number;
  status: string;
  vulnerabilities: string[];
}

interface PredictionResponse {
  prediction: number;
  is_anomaly: boolean;
  status: string;
}

type RootStackParamList = {
  Home: undefined;
  DeviceList: undefined;
  DeviceDetails: { device: Device };
};

const Stack = createStackNavigator<RootStackParamList>();

const recommendationsDB: { [key: string]: string } = {
  'Weak Password': 'Change the device password to a strong, unique one.',
  'Outdated Firmware': 'Update the device firmware via the manufacturer’s app.',
};

const HomeScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Welcome to SmartGuard</Text>
      <Button title="Scan Network" onPress={() => navigation.navigate('DeviceList')} />
    </View>
  );
};

const DeviceListScreen: React.FC<{ navigation: any }> = ({ navigation }) => {
  const [devices, setDevices] = useState<Device[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  const scanNetwork = async () => {
    setLoading(true);
    try {
      const response = await fetch('http://localhost:8000/scan', {  // Replace with your IP
        method: 'GET',
      });
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Scanned devices:', data.devices);
      setDevices(data.devices);
    } catch (error) {
      console.error('Scan Error:', error);
      setDevices([]); // Reset on error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    scanNetwork(); // Auto-scan on mount
  }, []);

  return (
    <View style={styles.container}>
      {loading ? (
        <Text>Scanning...</Text>
      ) : devices.length > 0 ? (
        <FlatList
          data={devices}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={styles.item}
              onPress={() => navigation.navigate('DeviceDetails', { device: item })}
            >
              <Text>{item.name} - {item.status}</Text>
            </TouchableOpacity>
          )}
        />
      ) : (
        <Text>No devices found</Text>
      )}
      <Button title="Rescan" onPress={scanNetwork} disabled={loading} />
    </View>
  );
};

const DeviceDetailsScreen: React.FC<{ route: any }> = ({ route }) => {
  const { device } = route.params as { device: Device };
  const [anomalyStatus, setAnomalyStatus] = useState<string>('Checking...');

  useEffect(() => {
    const checkBehavior = async () => {
      try {
        console.log('Making API call with traffic:', device.traffic);
        const response = await fetch('http://localhost:8000/predict', {  // Replace with your IP
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ traffic: device.traffic }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }

        const data: PredictionResponse = await response.json();
        console.log('API response:', data);
        setAnomalyStatus(data.status);
      } catch (error: any) {
        console.error('API Call Failed:', error);
        setAnomalyStatus(`Error: ${error.message}`);
      }
    };

    checkBehavior();
  }, [device]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{device.name}</Text>
      <Text>Status: {device.status}</Text>
      <Text>Traffic: {device.traffic.toFixed(2)} MB</Text>
      <Text>Behavioral Analysis: {anomalyStatus}</Text>
      <Text>
        Vulnerabilities:{' '}
        {device.vulnerabilities.length > 0 ? device.vulnerabilities.join(', ') : 'None'}
      </Text>
      {device.vulnerabilities.length > 0 && (
        <View>
          <Text style={styles.title}>Recommendations:</Text>
          {device.vulnerabilities.map((vuln, index) => (
            <Text key={index}>- {recommendationsDB[vuln]}</Text>
          ))}
        </View>
      )}
    </View>
  );
};

const App: React.FC = () => {
  return (
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} />
        <Stack.Screen name="DeviceList" component={DeviceListScreen} />
        <Stack.Screen name="DeviceDetails" component={DeviceDetailsScreen} />
      </Stack.Navigator>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  title: { fontSize: 24, marginBottom: 20 },
  item: { padding: 10, borderBottomWidth: 1, borderBottomColor: '#ccc' },
});

export default App;