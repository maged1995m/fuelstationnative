import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { type PropsWithChildren, useState } from "react";
import { ActivityIndicator, Alert, FlatList, Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { ScreenContainer } from "@/components/screen-container";
import { useAccounting } from "@/lib/accounting/accounting-context";

export const palette = {
  petroleum: "#0E4C5A",
  petrolDeep: "#083740",
  gold: "#D99A1C",
  green: "#187B4A",
  red: "#B3261E",
  background: "#F7F8F8",
  card: "#FFFFFF",
  ink: "#182326",
  muted: "#65777B",
  border: "#D7E0E1",
  softPetrol: "#E5F1F2",
  softGold: "#FFF2D7",
  softGreen: "#E3F4E9",
  softRed: "#FBE8E7",
};

export const today = () => new Date().toISOString().slice(0, 10);

export const formatMoney = (value: number, symbol = "ر.س") =>
  `${Number(value || 0).toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${symbol}`;

export function AppScreen({ children, scroll = true }: PropsWithChildren<{ scroll?: boolean }>) {
  const { isReady, error } = useAccounting();
  if (!isReady) {
    return <ScreenContainer containerClassName="bg-background" className="items-center justify-center"><ActivityIndicator size="large" color={palette.petroleum} /><Text style={styles.loadingText}>جارٍ فتح الدفتر المحلي…</Text></ScreenContainer>;
  }
  if (error) {
    return <ScreenContainer className="p-5 justify-center"><View style={styles.errorCard}><MaterialIcons name="error-outline" size={32} color={palette.red} /><Text style={styles.errorTitle}>تعذر تحميل البيانات المحلية</Text><Text style={styles.errorBody}>{error}</Text></View></ScreenContainer>;
  }
  return (
    <ScreenContainer containerClassName="bg-background" className="bg-background">
      {scroll ? <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">{children}</ScrollView> : children}
    </ScreenContainer>
  );
}

export function PageHeader({ title, subtitle, back = false, action }: { title: string; subtitle?: string; back?: boolean; action?: { icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void; label: string } }) {
  return <View style={styles.header}>
    <View style={styles.headerRow}>
      {back ? <Pressable accessibilityRole="button" accessibilityLabel="رجوع" onPress={() => router.back()} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><MaterialIcons name="arrow-forward" size={22} color={palette.petroleum} /></Pressable> : <View style={styles.headerSpacer} />}
      <View style={styles.headerText}><Text style={styles.pageTitle}>{title}</Text>{subtitle ? <Text style={styles.pageSubtitle}>{subtitle}</Text> : null}</View>
      {action ? <Pressable accessibilityRole="button" accessibilityLabel={action.label} onPress={action.onPress} style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}><MaterialIcons name={action.icon} size={22} color={palette.petroleum} /></Pressable> : <View style={styles.headerSpacer} />}
    </View>
  </View>;
}

export function Card({ children, tone = "default" }: PropsWithChildren<{ tone?: "default" | "petrol" | "gold" | "green" | "red" }>) {
  return <View style={[styles.card, tone === "petrol" && styles.cardPetrol, tone === "gold" && styles.cardGold, tone === "green" && styles.cardGreen, tone === "red" && styles.cardRed]}>{children}</View>;
}

export function MetricCard({ label, value, note, icon, tone = "petrol" }: { label: string; value: string; note?: string; icon: keyof typeof MaterialIcons.glyphMap; tone?: "petrol" | "gold" | "green" | "red" }) {
  const color = tone === "gold" ? palette.gold : tone === "green" ? palette.green : tone === "red" ? palette.red : palette.petroleum;
  const soft = tone === "gold" ? palette.softGold : tone === "green" ? palette.softGreen : tone === "red" ? palette.softRed : palette.softPetrol;
  return <View style={styles.metricCard}><View style={styles.metricHeader}><Text style={styles.metricLabel}>{label}</Text><View style={[styles.metricIcon, { backgroundColor: soft }]}><MaterialIcons name={icon} size={20} color={color} /></View></View><Text style={styles.metricValue}>{value}</Text>{note ? <Text style={styles.metricNote}>{note}</Text> : null}</View>;
}

export function AppButton({ title, onPress, icon, variant = "primary", disabled = false }: { title: string; onPress: () => void; icon?: keyof typeof MaterialIcons.glyphMap; variant?: "primary" | "secondary" | "outline" | "danger"; disabled?: boolean }) {
  const buttonStyle = variant === "secondary" ? styles.buttonSecondary : variant === "outline" ? styles.buttonOutline : variant === "danger" ? styles.buttonDanger : styles.buttonPrimary;
  const textStyle = variant === "outline" ? styles.buttonOutlineText : styles.buttonText;
  return <Pressable accessibilityRole="button" disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.button, buttonStyle, (pressed || disabled) && styles.pressed, disabled && styles.disabled]}><Text style={textStyle}>{title}</Text>{icon ? <MaterialIcons name={icon} size={19} color={variant === "outline" ? palette.petroleum : "#FFFFFF"} /> : null}</Pressable>;
}

export function SectionTitle({ title, action }: { title: string; action?: { label: string; onPress: () => void } }) {
  return <View style={styles.sectionTitleRow}><Text style={styles.sectionTitle}>{title}</Text>{action ? <Pressable onPress={action.onPress} style={({ pressed }) => [styles.textAction, pressed && styles.pressed]}><Text style={styles.textActionText}>{action.label}</Text></Pressable> : null}</View>;
}

export function FormInput({ label, value, onChangeText, placeholder, keyboardType = "default", multiline = false, editable = true }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; keyboardType?: "default" | "numeric"; multiline?: boolean; editable?: boolean }) {
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><TextInput value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor="#8B9A9D" keyboardType={keyboardType} multiline={multiline} editable={editable} textAlign="right" style={[styles.input, multiline && styles.inputMultiline, !editable && styles.inputDisabled]} /></View>;
}

export function SelectField({ label, value, placeholder, options, onChange }: { label: string; value?: string; placeholder: string; options: Array<{ label: string; value: string; note?: string }>; onChange: (value: string) => void }) {
  const [visible, setVisible] = useState(false);
  const selected = options.find((option) => option.value === value);
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><Pressable onPress={() => setVisible(true)} style={({ pressed }) => [styles.selectInput, pressed && styles.pressed]}><MaterialIcons name="expand-more" size={22} color={palette.muted} /><View style={styles.selectTextBlock}><Text style={[styles.selectValue, !selected && styles.placeholder]}>{selected?.label || placeholder}</Text>{selected?.note ? <Text style={styles.selectNote}>{selected.note}</Text> : null}</View></Pressable><Modal visible={visible} transparent animationType="slide" onRequestClose={() => setVisible(false)}><View style={styles.modalOverlay}><View style={styles.modalSheet}><View style={styles.modalGrip} /><Text style={styles.modalTitle}>{label}</Text><FlatList data={options} keyExtractor={(item) => item.value} renderItem={({ item }) => <Pressable onPress={() => { onChange(item.value); setVisible(false); }} style={({ pressed }) => [styles.optionRow, value === item.value && styles.optionRowSelected, pressed && styles.pressed]}><View><Text style={styles.optionLabel}>{item.label}</Text>{item.note ? <Text style={styles.optionNote}>{item.note}</Text> : null}</View>{value === item.value ? <MaterialIcons name="check-circle" size={21} color={palette.green} /> : null}</Pressable>} ListEmptyComponent={<Text style={styles.emptyModal}>لا توجد خيارات بعد.</Text>} /></View></View></Modal></View>;
}

export function EmptyState({ icon, title, body, action }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; body: string; action?: { title: string; onPress: () => void } }) {
  return <View style={styles.emptyState}><View style={styles.emptyIcon}><MaterialIcons name={icon} size={30} color={palette.petroleum} /></View><Text style={styles.emptyTitle}>{title}</Text><Text style={styles.emptyBody}>{body}</Text>{action ? <View style={styles.emptyAction}><AppButton title={action.title} onPress={action.onPress} icon="add" /></View> : null}</View>;
}

export function confirmDanger(title: string, message: string, onConfirm: () => void) {
  Alert.alert(title, message, [{ text: "إلغاء", style: "cancel" }, { text: "متابعة", style: "destructive", onPress: onConfirm }]);
}

export function notifySuccess(message: string) {
  Alert.alert("تم الحفظ", message);
}

const styles = StyleSheet.create({
  pageContent: { padding: 18, paddingBottom: 32, gap: 16 },
  loadingText: { color: palette.muted, marginTop: 12, fontSize: 15 },
  errorCard: { backgroundColor: palette.softRed, borderWidth: 1, borderColor: "#F2C4C0", borderRadius: 20, padding: 22, alignItems: "center", gap: 10 },
  errorTitle: { color: palette.red, fontSize: 18, fontWeight: "800", textAlign: "center" },
  errorBody: { color: palette.ink, fontSize: 14, textAlign: "center", lineHeight: 22 },
  header: { paddingTop: 4, paddingBottom: 2 },
  headerRow: { minHeight: 48, flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between" },
  headerText: { flex: 1, alignItems: "center" },
  pageTitle: { color: palette.ink, fontSize: 23, fontWeight: "800", textAlign: "center" },
  pageSubtitle: { color: palette.muted, fontSize: 12, marginTop: 2, textAlign: "center" },
  headerSpacer: { width: 42 },
  iconButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, alignItems: "center", justifyContent: "center" },
  card: { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: 18, padding: 16, gap: 10 },
  cardPetrol: { backgroundColor: palette.softPetrol, borderColor: "#C6E2E5" },
  cardGold: { backgroundColor: palette.softGold, borderColor: "#F4DCAB" },
  cardGreen: { backgroundColor: palette.softGreen, borderColor: "#C7E9D3" },
  cardRed: { backgroundColor: palette.softRed, borderColor: "#F2C4C0" },
  metricCard: { minHeight: 123, flex: 1, backgroundColor: palette.card, borderRadius: 17, borderWidth: 1, borderColor: palette.border, padding: 14, justifyContent: "space-between" },
  metricHeader: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", gap: 8 },
  metricLabel: { flex: 1, color: palette.muted, textAlign: "right", fontSize: 12, fontWeight: "700" },
  metricIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: "center", alignItems: "center" },
  metricValue: { color: palette.ink, textAlign: "right", fontSize: 18, fontWeight: "800", marginTop: 8 },
  metricNote: { color: palette.muted, textAlign: "right", fontSize: 11, marginTop: 5 },
  button: { minHeight: 48, borderRadius: 14, paddingHorizontal: 16, flexDirection: "row-reverse", alignItems: "center", justifyContent: "center", gap: 8 },
  buttonPrimary: { backgroundColor: palette.petroleum },
  buttonSecondary: { backgroundColor: palette.gold },
  buttonOutline: { backgroundColor: palette.card, borderColor: palette.petroleum, borderWidth: 1 },
  buttonDanger: { backgroundColor: palette.red },
  buttonText: { color: "#FFFFFF", fontSize: 15, fontWeight: "800" },
  buttonOutlineText: { color: palette.petroleum, fontSize: 15, fontWeight: "800" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.98 }] },
  disabled: { opacity: 0.45 },
  sectionTitleRow: { flexDirection: "row-reverse", alignItems: "center", justifyContent: "space-between", marginTop: 4 },
  sectionTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", textAlign: "right" },
  textAction: { padding: 6 },
  textActionText: { color: palette.petroleum, fontSize: 13, fontWeight: "700" },
  field: { gap: 7 },
  fieldLabel: { color: palette.ink, fontSize: 13, fontWeight: "700", textAlign: "right" },
  input: { minHeight: 48, borderColor: palette.border, borderWidth: 1, backgroundColor: palette.card, borderRadius: 13, paddingHorizontal: 13, color: palette.ink, fontSize: 15, writingDirection: "rtl" },
  inputMultiline: { minHeight: 96, textAlignVertical: "top", paddingTop: 12 },
  inputDisabled: { backgroundColor: "#EEF1F1", color: palette.muted },
  selectInput: { minHeight: 50, borderColor: palette.border, borderWidth: 1, backgroundColor: palette.card, borderRadius: 13, paddingHorizontal: 13, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectTextBlock: { flex: 1, alignItems: "flex-end", marginRight: 6 },
  selectValue: { color: palette.ink, fontSize: 15, fontWeight: "600", textAlign: "right" },
  placeholder: { color: "#8B9A9D", fontWeight: "400" },
  selectNote: { color: palette.muted, fontSize: 11, marginTop: 2, textAlign: "right" },
  modalOverlay: { flex: 1, backgroundColor: "rgba(8,55,64,0.42)", justifyContent: "flex-end" },
  modalSheet: { maxHeight: "70%", backgroundColor: palette.background, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: 26 },
  modalGrip: { alignSelf: "center", width: 42, height: 4, borderRadius: 4, backgroundColor: palette.border, marginBottom: 12 },
  modalTitle: { color: palette.ink, fontSize: 18, fontWeight: "800", textAlign: "right", marginBottom: 8 },
  optionRow: { borderBottomWidth: 1, borderBottomColor: palette.border, paddingVertical: 14, flexDirection: "row-reverse", justifyContent: "space-between", alignItems: "center", gap: 12 },
  optionRowSelected: { backgroundColor: palette.softGreen, marginHorizontal: -6, paddingHorizontal: 6, borderRadius: 10 },
  optionLabel: { color: palette.ink, fontSize: 15, fontWeight: "700", textAlign: "right" },
  optionNote: { color: palette.muted, fontSize: 12, marginTop: 3, textAlign: "right" },
  emptyModal: { color: palette.muted, textAlign: "center", padding: 24 },
  emptyState: { backgroundColor: palette.card, borderColor: palette.border, borderWidth: 1, borderRadius: 18, padding: 24, alignItems: "center" },
  emptyIcon: { width: 58, height: 58, borderRadius: 18, backgroundColor: palette.softPetrol, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  emptyTitle: { color: palette.ink, fontSize: 17, fontWeight: "800", textAlign: "center" },
  emptyBody: { color: palette.muted, fontSize: 13, lineHeight: 20, textAlign: "center", marginTop: 6 },
  emptyAction: { width: "100%", marginTop: 16 },
});
