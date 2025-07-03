import React from 'react'

import '../style.css'

import { createMemoryRouter, RouterProvider } from 'react-router'

import { RootLayout } from './layouts/root-layout'
import { Home } from './routes/home'
import { Settings } from './routes/settings'
import { SignInPage } from './routes/sign-in'
import { SignUpPage } from './routes/sign-up'

const router = createMemoryRouter([
  {
    // Wraps the entire app in the root layout
    element: <RootLayout />,
    // Mounted where the <Outlet /> component is inside the root layout
    children: [
      { path: '/', element: <Home /> },
      { path: '/sign-in', element: <SignInPage /> },
      { path: '/sign-up', element: <SignUpPage /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
])

export default function PopupIndex() {
  return <RouterProvider router={router} />
}
