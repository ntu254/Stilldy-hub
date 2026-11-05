import React from 'react'
import { View, type ViewProps } from 'react-native'

type ScreenShellProps = ViewProps & {
  topPadding?: number
}

export default function ScreenShell({ topPadding = 60, style, children, ...props }: ScreenShellProps) {
  return (
    <View
      {...props}
      style={[
        {
          flex: 1,
          backgroundColor: '#F8FAFC',
          paddingTop: topPadding,
        },
        style,
      ]}
    >
      {children}
    </View>
  )
}
