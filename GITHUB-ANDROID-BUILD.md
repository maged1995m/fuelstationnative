# بناء APK على GitHub Actions

يحتوي المشروع على workflow جاهز في:

```text
.github/workflows/build-android.yml
```

بعد رفع محتويات مجلد المشروع إلى مستودع GitHub:

1. افتح تبويب **Actions** في المستودع.
2. اختر workflow باسم **Build Android APK**.
3. اضغط **Run workflow** واختر الفرع المطلوب.
4. انتظر انتهاء خطوات تثبيت الاعتمادات والفحوصات والبناء.
5. افتح صفحة التشغيل الناجح، ثم نزّل Artifact باسم `fuel-station-offline-release-apk`.
6. فك ضغط Artifact، ثم ثبّت ملف `app-release.apk` على جهاز Android.

يعمل workflow تلقائيًا أيضًا عند كل Push إلى فرعي `main` أو `master`. قبل البناء يتم تشغيل `pnpm check` و`pnpm test`. يستخدم البناء Java 21 وAndroid SDK 36 وNDK 27.1.12297006، ويُخرج نسخة Release لمعمارية `arm64-v8a`.

> ملاحظة: إذا كان المستودع خاصًا أو كانت سياسات المؤسسة تمنع GitHub Actions، يجب تفعيل Actions من إعدادات المستودع. لا يحتاج هذا workflow إلى مفاتيح API أو أسرار خارجية.
