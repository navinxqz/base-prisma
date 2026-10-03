'use server';

import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const SESSION_COOKIE_NAME = 'lws_auth_token';

const MOCK_USER = {
  // id: 'user-1',
  // name: 'Sumit Saha',
  // email: 'sumit@learnwithsumit.com',
};

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  try {
    if (!token) {
      throw new Error("Token not found");
    }
    const user = await prisma.user.findFirst({
      where: { id: token }
    })
    return user;
  } catch (err) {
    console.log(err);
    return null;
  }

  return null;
}

export async function loginUser(prevState, formData) {
  const email = formData.get('email');
  const password = formData.get('password');

  if (!email || !password) {
    return { success: false, error: 'Email and password are required.' };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email,
        password
      }
    })
    if (!user) {
      return { success: false, error: "Invalid email or password" }
    }
    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: user.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
  } catch (err) {
    console.log(err);
    return { success: false, error: err.message }
  }

  redirect('/dashboard');
}

export async function registerUser(prevState, formData) {
  const name = formData.get('name');
  const email = formData.get('email');
  const password = formData.get('password');

  if (!name || !email || !password) {
    return { success: false, error: 'All fields are required.' };
  }

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password
      }
    })
    const cookieStore = await cookies();
    cookieStore.set({
      name: SESSION_COOKIE_NAME,
      value: user.id,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 1 week
    });
  } catch (err) {
    console.log(err)
    return { success: false, error: "Registration failed." }
  }
  redirect('/dashboard');
}

export async function logoutUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  redirect('/');
}
