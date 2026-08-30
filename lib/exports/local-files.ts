import AsyncStorage from "@react-native-async-storage/async-storage";
import { Directory, File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";

const EXTERNAL_DIRECTORY_KEY = "fuel-ledger:external-documents-directory";
const APP_DOCUMENTS_FOLDER = "دفاتر الوقود";

export interface SavedLocalFile {
  uri: string;
  fileName: string;
  locationLabel: string;
}

function appDocumentsDirectory() {
  const directory = new Directory(Paths.document, APP_DOCUMENTS_FOLDER);
  if (!directory.exists)
    directory.create({ idempotent: true, intermediates: true });
  return directory;
}

async function destinationDirectory() {
  const externalUri = await AsyncStorage.getItem(EXTERNAL_DIRECTORY_KEY);
  if (externalUri) {
    const externalDirectory = new Directory(externalUri);
    if (externalDirectory.exists)
      return {
        directory: externalDirectory,
        locationLabel: "مجلد Documents الذي اخترته",
      };
    await AsyncStorage.removeItem(EXTERNAL_DIRECTORY_KEY);
  }
  return {
    directory: appDocumentsDirectory(),
    locationLabel: "Documents الخاص بتطبيق دفاتر الوقود",
  };
}

export async function chooseDocumentsDirectory() {
  const directory = await Directory.pickDirectoryAsync();
  await AsyncStorage.setItem(EXTERNAL_DIRECTORY_KEY, directory.uri);
  return "مجلد Documents المختار";
}

export async function getDocumentsDirectoryLabel() {
  const externalUri = await AsyncStorage.getItem(EXTERNAL_DIRECTORY_KEY);
  if (externalUri) return "مجلد Documents المختار";
  return "Documents الخاص بتطبيق دفاتر الوقود";
}

export async function saveLocalTextFile(
  fileName: string,
  content: string,
): Promise<SavedLocalFile> {
  const { directory, locationLabel } = await destinationDirectory();
  const file = new File(directory, fileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(content);
  return { uri: file.uri, fileName, locationLabel };
}

export async function saveLocalBytesFile(
  fileName: string,
  bytes: Uint8Array,
): Promise<SavedLocalFile> {
  const { directory, locationLabel } = await destinationDirectory();
  const file = new File(directory, fileName);
  file.create({ overwrite: true, intermediates: true });
  file.write(bytes);
  return { uri: file.uri, fileName, locationLabel };
}

export async function copyLocalFileToDocuments(
  sourceUri: string,
  fileName: string,
): Promise<SavedLocalFile> {
  const { directory, locationLabel } = await destinationDirectory();
  const source = new File(sourceUri);
  const destination = new File(directory, fileName);
  if (destination.exists) destination.delete();
  source.copy(destination);
  return { uri: destination.uri, fileName, locationLabel };
}

export async function shareLocalFile(
  file: SavedLocalFile,
  mimeType: string,
  dialogTitle: string,
) {
  if (!(await Sharing.isAvailableAsync()))
    throw new Error("المشاركة المحلية غير متاحة على هذا الجهاز.");
  await Sharing.shareAsync(file.uri, { mimeType, dialogTitle });
}
