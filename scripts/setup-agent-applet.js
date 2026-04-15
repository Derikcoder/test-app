const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '../../field-agent-applet');

const tailwindConfig = `/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};
`;
fs.writeFileSync(path.join(targetDir, 'tailwind.config.js'), tailwindConfig);

const globalCss = `@tailwind base;\n@tailwind components;\n@tailwind utilities;\n`;
fs.writeFileSync(path.join(targetDir, 'global.css'), globalCss);

const babelConfig = `module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ["babel-preset-expo", { jsxImportSource: "nativewind" }],
      "nativewind/babel",
    ],
  };
};
`;
fs.writeFileSync(path.join(targetDir, 'babel.config.js'), babelConfig);

const metroConfig = `const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
`;
fs.writeFileSync(path.join(targetDir, 'metro.config.js'), metroConfig);

const appTsx = `import "./global.css";
import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';

export default function App() {
  return (
    <View className="flex-1 items-center justify-center bg-slate-900">
      <Text className="text-xl text-white font-bold">Field Agent Applet Ready!</Text>
      <Text className="text-sm text-cyan-400 mt-2">Nativewind V4 Configured</Text>
      <StatusBar style="light" />
    </View>
  );
}
`;
fs.writeFileSync(path.join(targetDir, 'App.tsx'), appTsx);

if (!fs.existsSync(path.join(targetDir, 'src'))) fs.mkdirSync(path.join(targetDir, 'src'));
if (!fs.existsSync(path.join(targetDir, 'src/api'))) fs.mkdirSync(path.join(targetDir, 'src/api'));
if (!fs.existsSync(path.join(targetDir, 'src/context'))) fs.mkdirSync(path.join(targetDir, 'src/context'));

const axiosJs = `import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

// Set this to your local machine IP where the backend runs
const API_URL = 'http://192.168.1.100:5000/api'; 

const axiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

axiosInstance.interceptors.request.use(
  async (config) => {
    const userInfoString = await SecureStore.getItemAsync('userInfo');
    if (userInfoString) {
      const userInfo = JSON.parse(userInfoString);
      if (userInfo?.token) {
        config.headers.Authorization = \`Bearer \${userInfo.token}\`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default axiosInstance;
`;
fs.writeFileSync(path.join(targetDir, 'src/api/axios.js'), axiosJs);

const authContextJs = `import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import axios from '../api/axios';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const userInfoString = await SecureStore.getItemAsync('userInfo');
        if (userInfoString) {
          const userInfo = JSON.parse(userInfoString);
          setUser(userInfo);
        }
      } catch (error) {
        console.error('Failed to load user info', error);
      } finally {
        setLoading(false);
      }
    };
    initializeAuth();
  }, []);

  const login = async (email, password) => {
    try {
      const { data } = await axios.post('/auth/login', { email, password });
      await SecureStore.setItemAsync('userInfo', JSON.stringify(data));
      setUser(data);
      return data;
    } catch (error) {
      throw error.response?.data?.message || 'Login failed';
    }
  };

  const logout = async () => {
    await SecureStore.deleteItemAsync('userInfo');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};
`;
fs.writeFileSync(path.join(targetDir, 'src/context/AuthContext.js'), authContextJs);

console.log('Applet setup complete.');
