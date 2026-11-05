import { StatusBar } from 'expo-status-bar'
import { Provider } from 'react-redux'
import { View } from 'react-native'
import { SafeAreaProvider } from 'react-native-safe-area-context'

import store from './redux/store'
import { GluestackUIProvider } from './components/ui/gluestack-ui-provider'
import AppNavigator from './navigation/AppNavigator'
import { ToastProvider, GlobalToast } from './components/ui/ToastProvider'

function AppContent() {
  return <AppNavigator />
}

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <GluestackUIProvider mode='dark'>
          <ToastProvider>
            {/* <View style={{ flex: 1 }} pointerEvents="box-none"> */}
              <AppContent />
              <GlobalToast />
            {/* </View> */}
            <StatusBar style='dark' />
          </ToastProvider>
        </GluestackUIProvider>
      </SafeAreaProvider>
    </Provider>
  )
}
