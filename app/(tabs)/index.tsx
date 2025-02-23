import React, { useState } from 'react';
import { StyleSheet, View, TextInput, TouchableOpacity, Text, ScrollView, ActivityIndicator } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { DataTable } from 'react-native-paper';
import XLSX from 'xlsx';
import { Ionicons } from '@expo/vector-icons';

export default function Index() {
  const [data, setData] = useState<any[][]>([]);
  const [columns, setColumns] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortConfig, setSortConfig] = useState<{ key: string | null; direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });
  const [loading, setLoading] = useState(false);

  const pickFile = async () => {
    setLoading(true);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
      });

      if (!result.canceled) {
        const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
          encoding: FileSystem.EncodingType.Base64,
        });
        processFile(fileContent);
      }
    } catch (error) {
      console.error('Error picking file:', error);
    } finally {
      setLoading(false);
    }
  };

  const processFile = (content: string) => {
    try {
      const workbook = XLSX.read(content, { type: 'base64' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      const headers = jsonData[0] as string[];
      const rows = jsonData.slice(1) as any[][];

      setColumns(headers);
      setData(rows);
    } catch (error) {
      console.error('Error processing file:', error);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });

    const sortedData = [...data].sort((a, b) => {
      const aValue = a[columns.indexOf(key)];
      const bValue = b[columns.indexOf(key)];

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return direction === 'asc' ? aValue - bValue : bValue - aValue;
      }
      return direction === 'asc'
        ? String(aValue).localeCompare(String(bValue))
        : String(bValue).localeCompare(String(aValue));
    });

    setData(sortedData);
  };

  const filteredData = data.filter(row =>
    row.some(cell =>
      String(cell).toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const exportToCSV = async () => {
    try {
      const csvContent = [
        columns.join(','),
        ...filteredData.map(row => row.join(','))
      ].join('\n');

      const fileUri = FileSystem.documentDirectory + 'exported_data.csv';
      await FileSystem.writeAsStringAsync(fileUri, csvContent);
      await Sharing.shareAsync(fileUri);
    } catch (error) {
      console.error('Error exporting CSV:', error);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Data Viewer</Text>
        <TouchableOpacity style={styles.exportButton} onPress={exportToCSV} disabled={data.length === 0}>
          <Ionicons name="download" size={20} color="white" />
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.uploadButton} onPress={pickFile}>
        <Ionicons name="cloud-upload" size={24} color="#2563eb" />
        <Text style={styles.uploadButtonText}>Upload CSV/Excel File</Text>
      </TouchableOpacity>

      <TextInput
        style={styles.searchInput}
        placeholder="Search..."
        value={searchQuery}
        onChangeText={setSearchQuery}
        editable={data.length > 0}
      />

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={styles.loader} />
      ) : (
        <ScrollView horizontal style={styles.tableContainer}>
          <DataTable>
            <DataTable.Header>
              {columns.map((column, index) => (
                <DataTable.Title
                  key={index}
                  style={styles.headerCell}
                  onPress={() => handleSort(column)}
                >
                  <Text style={styles.headerText}>{column}</Text>
                  {sortConfig.key === column && (
                    <Ionicons
                      name={sortConfig.direction === 'asc' ? 'arrow-up' : 'arrow-down'}
                      size={16}
                      color="white"
                    />
                  )}
                </DataTable.Title>
              ))}
            </DataTable.Header>

            {filteredData.map((row, rowIndex) => (
              <DataTable.Row key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <DataTable.Cell key={cellIndex} style={styles.cell}>
                    <Text>{cell}</Text>
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))}
          </DataTable>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', padding: 16 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 24, fontWeight: '600', color: '#1e293b' },
  uploadButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: 'white', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#2563eb', marginBottom: 16, gap: 8 },
  uploadButtonText: { color: '#2563eb', fontWeight: '500' },
  searchInput: { backgroundColor: 'white', padding: 12, borderRadius: 8, marginBottom: 16 },
  tableContainer: { backgroundColor: 'white', borderRadius: 12 },
  headerCell: { backgroundColor: '#2563eb', justifyContent: 'center', height: 50 },
  headerText: { color: 'white', fontWeight: '600', marginRight: 8 },
  cell: { justifyContent: 'center', minWidth: 100, height: 40 },
  exportButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#2563eb', padding: 10, borderRadius: 8, gap: 8 },
  exportButtonText: { color: 'white', fontWeight: '500' },
  loader: { marginTop: 40 }
});
