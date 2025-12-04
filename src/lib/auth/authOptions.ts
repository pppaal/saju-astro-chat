import type { NextAuthOptions } from 'next-auth'
import type { OAuthConfig } from 'next-auth/providers'
import CredentialsProvider from 'next-auth/providers/credentials'
import GoogleProvider from 'next-auth/providers/google'
import AppleProvider from 'next-auth/providers/apple'
import KakaoProvider from 'next-auth/providers/kakao'
import { PrismaAdapter } from '@next-auth/prisma-adapter'
import bcrypt from 'bcryptjs'
import { prisma } from '@/lib/db/prisma'

// Custom WeChat OAuth Provider
function WeChatProvider(options: any): OAuthConfig<any> {
  return {
    id: "wechat",
    name: "WeChat",
    type: "oauth",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: "https://open.weixin.qq.com/connect/qrconnect",
      params: {
        appid: options.clientId,
        scope: "snsapi_login",
        response_type: "code",
      },
    },
    token: "https://api.weixin.qq.com/sns/oauth2/access_token",
    userinfo: {
      url: "https://api.weixin.qq.com/sns/userinfo",
      async request({ tokens, provider }) {
        const response = await fetch(
          `https://api.weixin.qq.com/sns/userinfo?access_token=${tokens.access_token}&openid=${tokens.openid}`
        );
        return await response.json();
      },
    },
    profile(profile) {
      return {
        id: profile.openid,
        name: profile.nickname,
        email: profile.unionid ? `${profile.unionid}@wechat.user` : null,
        image: profile.headimgurl,
      };
    },
    style: {
      logo: "/oauth/wechat.svg",
      bg: "#07C160",
      text: "#fff",
    },
  };
}

// Custom WhatsApp OAuth Provider (using Meta/Facebook Business)
function WhatsAppProvider(options: any): OAuthConfig<any> {
  return {
    id: "whatsapp",
    name: "WhatsApp",
    type: "oauth",
    clientId: options.clientId,
    clientSecret: options.clientSecret,
    authorization: {
      url: "https://www.facebook.com/v18.0/dialog/oauth",
      params: {
        client_id: options.clientId,
        scope: "email,public_profile,whatsapp_business_management",
        response_type: "code",
      },
    },
    token: "https://graph.facebook.com/v18.0/oauth/access_token",
    userinfo: {
      url: "https://graph.facebook.com/me",
      params: { fields: "id,name,email,picture" },
    },
    profile(profile) {
      return {
        id: profile.id,
        name: profile.name,
        email: profile.email,
        image: profile.picture?.data?.url,
      };
    },
    style: {
      logo: "/oauth/whatsapp.svg",
      bg: "#25D366",
      text: "#fff",
    },
  };
}

// Build providers array conditionally
const providers: any[] = [];

// Always add Credentials provider (email/password)
providers.push(
  CredentialsProvider({
    name: 'Email',
    credentials: {
      email: { label: 'Email', type: 'email' },
      password: { label: 'Password', type: 'password' },
    },
    async authorize(credentials) {
      if (!credentials?.email || !credentials?.password) return null
      const user = await prisma.user.findUnique({ where: { email: credentials.email } })
      if (!user?.passwordHash) return null
      const ok = await bcrypt.compare(credentials.password, user.passwordHash)
      if (!ok) return null
      return { id: user.id, email: user.email, name: user.name }
    },
  })
);

// Add Google if configured
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  providers.push(
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    })
  );
}

// Add Apple if configured
if (process.env.APPLE_ID && process.env.APPLE_SECRET) {
  providers.push(
    AppleProvider({
      clientId: process.env.APPLE_ID,
      clientSecret: process.env.APPLE_SECRET,
    })
  );
}

// Add Kakao if configured
if (process.env.KAKAO_CLIENT_ID && process.env.KAKAO_CLIENT_SECRET) {
  providers.push(
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID,
      clientSecret: process.env.KAKAO_CLIENT_SECRET,
    })
  );
}

// Add WeChat if configured
if (process.env.WECHAT_APP_ID && process.env.WECHAT_APP_SECRET) {
  providers.push(
    WeChatProvider({
      clientId: process.env.WECHAT_APP_ID,
      clientSecret: process.env.WECHAT_APP_SECRET,
    })
  );
}

// Add WhatsApp if configured
if (process.env.WHATSAPP_APP_ID && process.env.WHATSAPP_APP_SECRET) {
  providers.push(
    WhatsAppProvider({
      clientId: process.env.WHATSAPP_APP_ID,
      clientSecret: process.env.WHATSAPP_APP_SECRET,
    })
  );
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma),
  providers,
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = (user as any).id ?? token.id
        token.email = (user as any).email ?? token.email
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.email = token.email as string
      }
      return session
    },
  },
}
