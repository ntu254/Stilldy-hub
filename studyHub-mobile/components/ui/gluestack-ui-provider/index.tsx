import React, { useEffect } from 'react'
import { config } from './config'
import { Appearance, View, ViewProps } from 'react-native'
import { OverlayProvider } from '@gluestack-ui/core/overlay/creator'
import { ToastProvider } from '@gluestack-ui/core/toast/creator'
import { useColorScheme } from 'nativewind'

export type ModeType = 'light' | 'dark' | 'system'

export function GluestackUIProvider({
  mode = 'light',
  ...props
}: {
  mode?: ModeType
  children?: React.ReactNode
  style?: ViewProps['style']
}) {
  const { colorScheme, setColorScheme } = useColorScheme()

  useEffect(() => {
    try {
      setColorScheme(mode)
    } catch {
      // Fallback: use React Native's Appearance API when NativeWind's
      // class-based dark mode is not yet compiled into the CSS bundle.
      Appearance.setColorScheme(mode === 'system' ? null : mode)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode])

  return (
    <View style={[config[colorScheme!], { flex: 1, height: '100%', width: '100%' }, props.style]}>
      <OverlayProvider>
        <ToastProvider>{props.children}</ToastProvider>
      </OverlayProvider>
    </View>
  )
}
