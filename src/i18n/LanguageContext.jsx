import { createContext, useContext, useState, useEffect, useRef } from 'react'
import { translations } from './translations'
import { useFlowSafe } from '../kiosk/state/FlowContext'

const LanguageContext = createContext(null)

export function LanguageProvider({ children }) {
  const flow = useFlowSafe()
  const settings = flow?.settings || null
  const enabledLangs = settings?.languages?.length ? settings.languages : ['tr', 'en']
  const [lang, setLangState] = useState('tr')
  const userChanged = useRef(false)

  // Ayarlar yüklenince, kullanıcı henüz değiştirmediyse varsayılan dile geç
  useEffect(() => {
    if (userChanged.current) return
    const def = settings?.defaultLanguage
    if (def && enabledLangs.includes(def) && def !== lang) setLangState(def)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings])

  const setLang = (l) => {
    userChanged.current = true
    setLangState(l)
  }
  const t = (key) => translations[lang]?.[key] ?? key
  const tl = (obj) => (obj ? obj[lang] ?? obj.tr ?? '' : '')

  return (
    <LanguageContext.Provider value={{ lang, setLang, enabledLangs, t, tl }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const ctx = useContext(LanguageContext)
  if (!ctx) throw new Error('useLanguage, LanguageProvider içinde kullanılmalı')
  return ctx
}
