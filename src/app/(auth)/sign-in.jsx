/**
 * Mova Sign-in Route
 *
 * Mounts the canonical SignInScreen within the unauthenticated route group.
 */

import React from 'react';

import { SignInScreen } from '@/components/sign-in-screen';

export default function SignInRoute() {
  return <SignInScreen />;
}
