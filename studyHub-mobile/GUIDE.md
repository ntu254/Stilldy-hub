# VisionCare Mobile - Setup Notes

## 1. Tạo project Expo trong thư mục hiện tại

```bash id="yls3l7"
npx create-expo-app@latest . --template blank
```

### Giải thích

* `.` → tạo project ngay trong thư mục hiện tại
* `--template blank` → template trắng tối giản

---

# 2. Chạy project Expo

```bash id="rkx4f8"
npx expo start
```

Hoặc:

```bash id="l1x4mk"
npm start
```

---

# 3. Setup NativeWind + Tailwind

## Cài dependencies

```bash id="dcdb1z"
npm install nativewind tailwindcss react-native-reanimated react-native-safe-area-context react-native-screens react-native-svg
```

## Tạo Tailwind config

```bash id="n5v5nd"
npx tailwindcss init
```

---

# 4. Setup Gluestack UI

```bash id="77vzdf"
npx gluestack-ui init
```

### Sau khi chạy

CLI sẽ tự:

* setup Babel
* setup Metro
* tạo `global.css`
* thêm NativeWind config
* cài thêm UI packages cần thiết

---

# 5. Setup Navigation

```bash id="b8g3xp"
npm install @react-navigation/native @react-navigation/native-stack @react-navigation/bottom-tabs
```

---

# 6. Setup Redux Toolkit + Axios

```bash id="hs9fxf"
npm install axios @reduxjs/toolkit react-redux
```

---

# 7. Stack hiện tại của project

| Package          | Vai trò                   |
| ---------------- | ------------------------- |
| Expo             | Runtime/App framework     |
| React Native     | Mobile framework          |
| NativeWind       | Tailwind cho React Native |
| Gluestack UI     | UI component library      |
| React Navigation | Điều hướng                |
| Redux Toolkit    | State management          |
| Axios            | API calling               |

---

# 8. Cấu trúc thư mục đề xuất

```txt id="v2b8n8"
src/
 ├── components/
 ├── screens/
 ├── navigation/
 ├── services/
 ├── store/
 ├── hooks/
 ├── utils/
 ├── constants/
 └── types/
```

---

# 9. Một số file được tạo thêm sau setup

| File                  | Ý nghĩa                     |
| --------------------- | --------------------------- |
| `global.css`          | Tailwind global styles      |
| `tailwind.config.js`  | Config Tailwind             |
| `nativewind-env.d.ts` | Type support cho NativeWind |
| `metro.config.js`     | Metro bundler config        |
| `babel.config.js`     | Babel config                |

---

# 10. Lưu ý TypeScript

Project hiện đang có:

```txt id="pfm6h6"
App.js
App.tsx
```

Nên chỉ giữ lại:

```txt id="53w6gv"
App.tsx
```

và xóa:

```txt id="gj6bhz"
App.js
```

để tránh conflict giữa JavaScript và TypeScript.
