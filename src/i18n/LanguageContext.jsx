import { createContext, useContext, useState } from 'react'
import { translations } from './translations'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const [lang, setLang] = useState('tr')
  const t = (key) => translations[lang]?.[key] ?? key
  const tl = (obj) => (obj ? obj[lang] ?? obj.tr ?? '' : '')
  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tl }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage, LanguageProvider içinde kullanılmalı')
  return ctx
}
