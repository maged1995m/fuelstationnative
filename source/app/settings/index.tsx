import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { router } from "expo-router";
import { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, View } from "react-native";

import {
  AppButton,
  AppScreen,
  Card,
  FormInput,
  PageHeader,
  SectionTitle,
  palette,
  today,
} from "@/components/accounting-ui";
import { useAccounting } from "@/lib/accounting/accounting-context";
import { exportLocalState } from "@/lib/accounting/local-store";
import {
  chooseDocumentsDirectory,
  getDocumentsDirectoryLabel,
  saveLocalTextFile,
  shareLocalFile,
} from "@/lib/exports/local-files";

export default function SettingsScreen() {
  const { state, saveProfile, restoreBackup } = useAccounting();
  const [name, setName] = useState(state.profile?.name || "");
  const [currencyCode, setCurrencyCode] = useState(
    state.profile?.currencyCode || "SAR",
  );
  const [currencySymbol, setCurrencySymbol] = useState(
    state.profile?.currencySymbol || "ر.س",
  );
  const [openingDate, setOpeningDate] = useState(
    state.profile?.openingDate || today(),
  );
  const [saving, setSaving] = useState(false);
  const [documentsLocation, setDocumentsLocation] = useState(
    "Documents الخاص بتطبيق دفاتر الوقود",
  );
  useEffect(() => {
    getDocumentsDirectoryLabel().then(setDocumentsLocation);
  }, []);

  const save = async () => {
    try {
      setSaving(true);
      await saveProfile({ name, currencyCode, currencySymbol, openingDate });
      Alert.alert("تم الحفظ", "حُفظت بيانات المحطة محلياً على هذا الجهاز.");
    } catch (error) {
      Alert.alert(
        "تعذر الحفظ",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    } finally {
      setSaving(false);
    }
  };
  const exportBackup = async () => {
    try {
      const content = await exportLocalState();
      const filename = `fuel-ledger-backup-${today()}.json`;
      const file = await saveLocalTextFile(filename, content);
      await shareLocalFile(
        file,
        "application/json",
        "مشاركة نسخة دفاتر الوقود",
      );
      Alert.alert(
        "تم إنشاء النسخة",
        `حُفظ ${file.fileName} في ${file.locationLabel}.`,
      );
    } catch (error) {
      Alert.alert(
        "تعذر إنشاء النسخة",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    }
  };
  const chooseBackupFolder = async () => {
    try {
      const label = await chooseDocumentsDirectory();
      setDocumentsLocation(label);
      Alert.alert(
        "تم اختيار المجلد",
        "ستُحفظ النسخ والتقارير القادمة في مجلد Documents الذي اخترته.",
      );
    } catch (error) {
      Alert.alert(
        "تعذر اختيار المجلد",
        error instanceof Error ? error.message : "تعذر فتح اختيار المجلد.",
      );
    }
  };
  const importBackup = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["application/json", "text/json", "*/*"],
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled) return;
      const content = await new File(result.assets[0].uri).text();
      Alert.alert(
        "تأكيد الاستعادة",
        "ستستبدل هذه العملية بيانات التطبيق المحلية الحالية بالنسخة التي اخترتها.",
        [
          { text: "إلغاء", style: "cancel" },
          {
            text: "استعادة",
            style: "destructive",
            onPress: async () => {
              try {
                await restoreBackup(content);
                Alert.alert("تمت الاستعادة", "استُعيدت النسخة المحلية بنجاح.");
              } catch (error) {
                Alert.alert(
                  "تعذرت الاستعادة",
                  error instanceof Error ? error.message : "الملف غير صالح.",
                );
              }
            },
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        "تعذر فتح الملف",
        error instanceof Error ? error.message : "حدث خطأ غير متوقع.",
      );
    }
  };

  return (
    <AppScreen>
      <PageHeader
        title="إعدادات المحطة"
        subtitle="إعدادات محلية لا تحتاج إلى إنترنت"
        back
      />
      <SectionTitle title="بيانات المحطة" />
      <Card>
        <FormInput
          label="اسم المحطة"
          value={name}
          onChangeText={setName}
          placeholder="مثال: محطة الأمان"
        />
        <View style={styles.row}>
          <View style={styles.grow}>
            <FormInput
              label="رمز العملة"
              value={currencyCode}
              onChangeText={setCurrencyCode}
              placeholder="SAR"
            />
          </View>
          <View style={styles.small}>
            <FormInput
              label="الرمز"
              value={currencySymbol}
              onChangeText={setCurrencySymbol}
              placeholder="ر.س"
            />
          </View>
        </View>
        <FormInput
          label="تاريخ بدء الدفاتر"
          value={openingDate}
          onChangeText={setOpeningDate}
          placeholder="YYYY-MM-DD"
        />
        <AppButton
          title={saving ? "جارٍ الحفظ…" : "حفظ إعدادات المحطة"}
          icon="save"
          disabled={saving}
          onPress={save}
        />
      </Card>
      <SectionTitle title="البيانات الأساسية" />
      <Card>
        <Text style={styles.cardBody}>
          أضف الأصناف والخزانات والعملاء والموردين قبل تسجيل المخزون الافتتاحي
          أو إصدار الفواتير.
        </Text>
        <AppButton
          title="إدارة الأصناف والخزانات والجهات"
          icon="tune"
          onPress={() => router.push("/settings/masters")}
          variant="outline"
        />
      </Card>
      <SectionTitle title="النسخ الاحتياطي المحلي" />
      <Card tone="petrol">
        <Text style={styles.backupTitle}>بياناتك لا تُرفع إلى الإنترنت</Text>
        <Text style={styles.cardBody}>
          مكان الحفظ الحالي: {documentsLocation}. يمكنك اختيار مجلد Documents
          ظاهر في ذاكرة الهاتف، أو استخدام Documents الخاص بالتطبيق. ينشئ التطبيق
          نسخة تلقائية بعد كل تغيير محفوظ، كما يمكنك إنشاء نسخة يدوية أو استعادة
          نسخة سابقة. عند الاستعادة، سيستبدل الملف المختار كل البيانات الحالية.
        </Text>
        <AppButton
          title="اختيار مجلد Documents للحفظ"
          icon="folder-open"
          onPress={chooseBackupFolder}
          variant="outline"
        />
        <AppButton
          title="تصدير نسخة احتياطية"
          icon="ios-share"
          onPress={exportBackup}
        />
        <AppButton
          title="استعادة نسخة محلية"
          icon="upload-file"
          onPress={importBackup}
          variant="outline"
        />
      </Card>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row-reverse", gap: 10 },
  grow: { flex: 1.4 },
  small: { flex: 0.8 },
  cardBody: {
    color: palette.muted,
    fontSize: 13,
    lineHeight: 21,
    textAlign: "right",
  },
  backupTitle: {
    color: palette.petroleum,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "right",
  },
});
