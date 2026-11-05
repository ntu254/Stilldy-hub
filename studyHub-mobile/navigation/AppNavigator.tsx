import React from 'react'
import { NavigationContainer, type NavigatorScreenParams } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useSelector } from 'react-redux'

import AuthScreen from '../screens/AuthScreen'
import HomeScreen from '../screens/main/HomeScreen'
import DocumentsScreen from '../screens/main/DocumentsScreen'
import ChatScreen from '../screens/main/ChatScreen'
import ProfileScreen from '../screens/main/ProfileScreen'
import EditProfileScreen from '../screens/main/EditProfileScreen'
import DocumentViewerScreen from '../screens/main/DocumentViewerScreen'
import ChangePasswordScreen from '../screens/main/ChangePasswordScreen'
import TermsScreen from '../screens/main/TermsScreen'
import SubscriptionScreen from '../screens/main/SubscriptionScreen'
import TransactionHistoryScreen from '../screens/main/TransactionHistoryScreen'
import FlashcardsScreen from '../screens/main/FlashcardsScreen'
import FlashcardDetailScreen from '../screens/main/FlashcardDetailScreen'
import EditFlashcardScreen from '../screens/main/EditFlashcardScreen'
import TrashBinScreen from '../screens/main/TrashBinScreen'
import AdminDashboardScreen from '../screens/admin/AdminDashboardScreen'
import AdminReportedDocsScreen from '../screens/admin/AdminReportedDocsScreen'
import AdminUsersScreen from '../screens/admin/AdminUsersScreen'
import AdminPlansScreen from '../screens/admin/AdminPlansScreen'
import AdminPaymentsScreen from '../screens/admin/AdminPaymentsScreen'
import BottomTabBar from '../components/navigation/BottomTabBar'
import { RootState } from '../redux/store'

export type MainTabParamList = {
  Home: undefined
  Documents: { tab?: 'public' | 'mine' | 'saved' } | undefined
  Chat:
    | { documentId?: string; documentTitle?: string; sourceSubject?: string; source?: 'document' | 'viewer' }
    | undefined
  Flashcards: { showBack?: boolean } | undefined
  Profile: undefined
  AdminDashboard: undefined
  AdminReportedDocs: { tab?: 'all' | 'reported' } | undefined
  AdminUsers: undefined
  AdminPlans: { fromDashboard?: boolean } | undefined
  AdminPayments: { fromDashboard?: boolean } | undefined
}

export type RootStackParamList = {
  Auth: undefined
  MainTabs: NavigatorScreenParams<MainTabParamList> | undefined
  DocumentViewer: { documentId: string; documentTitle: string; sourceSubject?: string } | undefined
  EditProfile: undefined
  ChangePassword: undefined
  Terms: undefined
  FlashcardDetail: { collectionId: string }
  EditFlashcard: { collectionId: string }
  Subscription: undefined
  TransactionHistory: undefined
  TrashBin: undefined
  AdminDocs: { tab?: 'all' | 'reported' } | undefined
  Chat:
    | { documentId?: string; documentTitle?: string; sourceSubject?: string; source?: 'document' | 'viewer' }
    | undefined
}

const RootStack = createNativeStackNavigator<RootStackParamList>()
const Tab = createBottomTabNavigator<MainTabParamList>()

function MainTabs() {
  const user = useSelector((state: RootState) => state.auth.user)
  const isAdmin = user?.role === 'admin'

  return (
    <Tab.Navigator
      initialRouteName={isAdmin ? 'AdminDashboard' : 'Home'}
      tabBar={(props) => <BottomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      {isAdmin ? (
        <>
          <Tab.Screen name='AdminDashboard' component={AdminDashboardScreen} />
          <Tab.Screen name='AdminReportedDocs' component={AdminReportedDocsScreen} />
          <Tab.Screen name='AdminUsers' component={AdminUsersScreen} />
          <Tab.Screen name='AdminPlans' component={AdminPlansScreen} />
          <Tab.Screen name='AdminPayments' component={AdminPaymentsScreen} />
          <Tab.Screen name='Profile' component={ProfileScreen} />
        </>
      ) : (
        <>
          <Tab.Screen name='Home' component={HomeScreen} />
          <Tab.Screen name='Documents' component={DocumentsScreen} />
          <Tab.Screen name='Chat' component={ChatScreen} />
          <Tab.Screen name='Flashcards' component={FlashcardsScreen} />
          <Tab.Screen name='Profile' component={ProfileScreen} />
        </>
      )}
    </Tab.Navigator>
  )
}

export default function AppNavigator() {
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated)

  return (
    <NavigationContainer>
      <RootStack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <RootStack.Screen name='Auth' component={AuthScreen} />
        ) : (
          <>
            <RootStack.Screen name='MainTabs' component={MainTabs} />
            <RootStack.Screen
              name='DocumentViewer'
              component={DocumentViewerScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <RootStack.Screen
              name='EditProfile'
              component={EditProfileScreen}
              options={{ presentation: 'modal', animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name='ChangePassword'
              component={ChangePasswordScreen}
              options={{ presentation: 'modal', animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name='Terms'
              component={TermsScreen}
              options={{ presentation: 'modal', animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name='Subscription'
              component={SubscriptionScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <RootStack.Screen
              name='TransactionHistory'
              component={TransactionHistoryScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />

            <RootStack.Screen
              name='FlashcardDetail'
              component={FlashcardDetailScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name='EditFlashcard'
              component={EditFlashcardScreen}
              options={{ presentation: 'modal', animation: 'slide_from_bottom' }}
            />
            <RootStack.Screen
              name='TrashBin'
              component={TrashBinScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
            <RootStack.Screen
              name='AdminDocs'
              component={AdminReportedDocsScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />

            <RootStack.Screen
              name='Chat'
              component={ChatScreen}
              options={{ presentation: 'card', animation: 'slide_from_right' }}
            />
          </>
        )}
      </RootStack.Navigator>
    </NavigationContainer>
  )
}
