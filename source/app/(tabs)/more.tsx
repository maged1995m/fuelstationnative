import { MaterialIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { AppScreen, PageHeader, palette } from "@/components/accounting-ui";

const menu = [
  { title: "المضخات والعدادات", subtitle: "المضخات المرتبطة بالخزانات وسجل قراءات العدادات", icon: "local-gas-station" as const, route: "/pumps" },
  { title: "دليل الحسابات", subtitle: "تعريف الحسابات ومراجعة الأرصدة", icon: "account-tree" as const, route: "/accounting/accounts" },
  { title: "القيود اليومية", subtitle: "مراجعة القيود وإدخال قيد يدوي متوازن", icon: "menu-book" as const, route: "/accounting/journals" },
  { title: "سندات القبض والصرف", subtitle: "تحصيل وسداد على مستوى الجهات أو الحسابات", icon: "receipt-long" as const, route: "/accounting/vouchers" },
  { title: "جهات التعامل", subtitle: "العملاء والموردون وحساباتهم", icon: "groups" as const, route: "/settings/masters" },
  { title: "التقارير", subtitle: "المبيعات والمشتريات والأستاذ وميزان المراجعة", icon: "analytics" as const, route: "/reports" },
  { title: "الكشوف التفصيلية", subtitle: "كشف الجهات والحسابات وحركة الأصناف", icon: "view-list" as const, route: "/detailed-reports" },
  { title: "إعدادات المحطة", subtitle: "اسم المحطة والعملة والبيانات الأساسية", icon: "settings" as const, route: "/settings" },
];

export default function MoreScreen() {
  return <AppScreen><PageHeader title="المزيد" subtitle="إدارة النظام والبيانات المحاسبية" />
    <View style={styles.intro}><MaterialIcons name="phonelink-lock" size={25} color={palette.petroleum} /><View style={styles.introText}><Text style={styles.introTitle}>تطبيق محلي بالكامل</Text><Text style={styles.introBody}>لا يحتاج اتصالاً بالإنترنت، وتبقى بياناتك على الجهاز.</Text></View></View>
    <View style={styles.menu}>{menu.map((item) => <Pressable key={item.title} onPress={() => router.push(item.route as never)} style={({ pressed }) => [styles.menuRow, pressed && styles.pressed]}><MaterialIcons name="chevron-left" size={23} color={palette.muted} /><View style={styles.menuText}><Text style={styles.menuTitle}>{item.title}</Text><Text style={styles.menuSub}>{item.subtitle}</Text></View><View style={styles.menuIcon}><MaterialIcons name={item.icon} size={21} color={palette.petroleum} /></View></Pressable>)}</View>
  </AppScreen>;
}

const styles = StyleSheet.create({
  intro: { backgroundColor: palette.softPetrol, borderWidth: 1, borderColor: "#C6E2E5", borderRadius: 17, padding: 15, flexDirection: "row-reverse", gap: 11, alignItems: "flex-start" }, introText: { flex: 1 }, introTitle: { color: palette.petroleum, fontSize: 15, fontWeight: "800", textAlign: "right" }, introBody: { color: palette.muted, fontSize: 12, lineHeight: 19, marginTop: 3, textAlign: "right" }, menu: { backgroundColor: palette.card, borderWidth: 1, borderColor: palette.border, borderRadius: 17, overflow: "hidden" }, menuRow: { minHeight: 73, borderBottomColor: palette.border, borderBottomWidth: 1, flexDirection: "row-reverse", alignItems: "center", gap: 11, paddingHorizontal: 14 }, menuIcon: { width: 37, height: 37, borderRadius: 12, backgroundColor: palette.softPetrol, alignItems: "center", justifyContent: "center" }, menuText: { flex: 1 }, menuTitle: { color: palette.ink, fontSize: 15, fontWeight: "800", textAlign: "right" }, menuSub: { color: palette.muted, fontSize: 11, marginTop: 3, textAlign: "right" }, pressed: { opacity: 0.7 },
});
