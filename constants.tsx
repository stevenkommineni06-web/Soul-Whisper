
import { Situation, Language } from './types';

export const VOICES = [
  { id: 'Kore', label: 'Bright & Clear', gender: 'Female', icon: '✨' },
  { id: 'Zephyr', label: 'Gentle & Soothing', gender: 'Female', icon: '🌬️' },
  { id: 'Puck', label: 'Warm & Friendly', gender: 'Male', icon: '☀️' },
  { id: 'Charon', label: 'Deep & Resonant', gender: 'Male', icon: '🌊' }
];

export const SITUATIONS: Situation[] = [
  { 
    id: 'holy_spirit', 
    label: 'Holy Spirit', 
    icon: '🕊️', 
    description: 'Guidance, comfort, and the power of the indwelling Spirit.',
    subTopics: [
      { label: 'Divine Guidance', icon: '🧭' }, { label: 'Comforter', icon: '🫂' }, 
      { label: 'Empowerment', icon: '⚡' }, { label: 'Seal of Promise', icon: '📜' }, 
      { label: 'Conviction', icon: '⚖️' }, { label: 'Anointing', icon: '🍯' }, 
      { label: 'Intercession', icon: '🙏' }, { label: 'Sweet Fellowship', icon: '🤝' }
    ]
  },
  { 
    id: 'fruit_of_spirit', 
    label: 'Fruit of the Spirit', 
    icon: '🍇', 
    description: 'Cultivating the character and nature of Christ.',
    subTopics: [
      { label: 'Unconditional Love', icon: '❤️' }, { label: 'Abiding Joy', icon: '✨' }, 
      { label: 'Surpassing Peace', icon: '🌊' }, { label: 'Long-suffering', icon: '⏳' }, 
      { label: 'Kindness', icon: '🍯' }, { label: 'Goodness', icon: '💎' }, 
      { label: 'Faithfulness', icon: '⚓' }, { label: 'Gentleness', icon: '🦋' },
      { label: 'Self-Control', icon: '🛡️' }
    ]
  },
  { 
    id: 'blessings', 
    label: 'Divine Blessings', 
    icon: '✨', 
    description: 'Invoking favor and abundance over every area of life.',
    subTopics: [
      { label: 'Household Peace', icon: '🏠' }, { label: 'Generational', icon: '🌳' }, 
      { label: 'Fruitful Labor', icon: '🛠️' }, { label: 'Divine Favor', icon: '🌟' }, 
      { label: 'Spiritual Riches', icon: '💰' }, { label: 'Health & Vitality', icon: '🌿' },
      { label: 'Wisdom & Insight', icon: '💡' }, { label: 'Overflowing Joy', icon: '🍷' }
    ]
  },
  { 
    id: 'gifts_spirit', 
    label: 'Spiritual Gifts', 
    icon: '🎁', 
    description: 'Activating the supernatural abilities given for the body.',
    subTopics: [
      { label: 'Word of Wisdom', icon: '💎' }, { label: 'Word of Knowledge', icon: '🔍' }, 
      { label: 'Gift of Faith', icon: '⛰️' }, { label: 'Gifts of Healing', icon: '🩹' }, 
      { label: 'Working of Miracles', icon: '🌊' }, { label: 'Prophecy', icon: '🗣️' },
      { label: 'Discernment', icon: '⚖️' }, { label: 'Various Tongues', icon: '🔥' }
    ]
  },
  { 
    id: 'holiness', 
    label: 'Holiness & Purity', 
    icon: '🕯️', 
    description: 'Walking the path of sanctification and righteousness.',
    subTopics: [
      { label: 'Purity of Heart', icon: '🤍' }, { label: 'Sanctification', icon: '🧼' }, 
      { label: 'Set Apart', icon: '🛡️' }, { label: 'Righteous Walk', icon: '👣' }, 
      { label: 'Transformation', icon: '🦋' }, { label: 'Fear of the Lord', icon: '🙇' },
      { label: 'Consecration', icon: '🏺' }, { label: 'Victory over Sin', icon: '⚔️' }
    ]
  },
  { 
    id: 'deliverance', 
    label: 'Deliverance', 
    icon: '⛓️', 
    description: 'Breaking chains and finding freedom in Christ.',
    subTopics: [
      { label: 'Breaking Addictions', icon: '🔗' }, { label: 'Chain Breaking', icon: '🔨' }, 
      { label: 'Protection from Evil', icon: '🛡️' }, { label: 'Emotional Healing', icon: '❤️‍🩹' }, 
      { label: 'Spiritual Victory', icon: '🚩' }, { label: 'Mind Renewal', icon: '🧠' },
      { label: 'Stronghold Breaking', icon: '🏰' }, { label: 'Freedom from Fear', icon: '🕊️' }
    ]
  },
  { 
    id: 'second_coming', 
    label: 'The Second Coming', 
    icon: '🎺', 
    description: 'The blessed hope of the Lord’s return.',
    subTopics: [
      { label: 'Watchfulness', icon: '👁️' }, { label: 'Readiness', icon: '🕯️' }, 
      { label: 'Hope of Glory', icon: '🌅' }, { label: 'Kingdom Come', icon: '👑' }, 
      { label: 'Eternal Life', icon: '♾️' }, { label: 'Final Victory', icon: '🏆' },
      { label: 'Bride of Christ', icon: '💍' }, { label: 'The Great Day', icon: '☀️' }
    ]
  },
  { 
    id: 'heaven', 
    label: 'Heavenly Home', 
    icon: '🏰', 
    description: 'Glimpsing the eternal dwelling and presence of God.',
    subTopics: [
      { label: 'Eternal Rest', icon: '🛌' }, { label: 'No More Pain', icon: '🚫' }, 
      { label: 'God\'s Presence', icon: '☁️' }, { label: 'New Jerusalem', icon: '🏙️' }, 
      { label: 'Crown of Life', icon: '👑' }, { label: 'Family Reunion', icon: '👨‍👩‍👧‍👦' },
      { label: 'Golden Streets', icon: '✨' }, { label: 'Worship Forever', icon: '🎶' }
    ]
  },
  { 
    id: 'children', 
    label: 'Children', 
    icon: '👶', 
    description: 'Protection and guidance for the next generation.',
    subTopics: [
      { label: 'Safety', icon: '🛡️' }, { label: 'Spiritual Growth', icon: '🌱' }, 
      { label: 'School Success', icon: '📚' }, { label: 'Purpose', icon: '🎯' }, 
      { label: 'Healing', icon: '🌿' }, { label: 'Friendships', icon: '🤝' }, 
      { label: 'Obedience', icon: '🙏' }, { label: 'Future Spouse', icon: '💍' }
    ]
  },
  { 
    id: 'marriage', 
    label: 'Marriage', 
    icon: '💍', 
    description: 'Unity and harmony in the marital bond.',
    subTopics: [
      { label: 'Communication', icon: '🗣️' }, { label: 'Forgiveness', icon: '🕊️' }, 
      { label: 'Intimacy', icon: '🕯️' }, { label: 'Rekindling Love', icon: '🔥' }, 
      { label: 'Conflict Resolution', icon: '⚖️' }, { label: 'Infidelity Healing', icon: '❤️‍🩹' }
    ]
  },
  { 
    id: 'health', 
    label: 'Physical Health', 
    icon: '🌿', 
    description: 'Divine healing and bodily restoration.',
    subTopics: [
      { label: 'Chronic Pain', icon: '🩹' }, { label: 'Cancer Battle', icon: '🎗️' }, 
      { label: 'Surgery Prep', icon: '🩺' }, { label: 'Mental Clarity', icon: '💡' }, 
      { label: 'Immune System', icon: '🛡️' }, { label: 'Strength', icon: '🏋️' }
    ]
  },
  { 
    id: 'finances', 
    label: 'Finances', 
    icon: '📈', 
    description: 'Provision and stewardship in difficult times.',
    subTopics: [
      { label: 'Debt Freedom', icon: '✂️' }, { label: 'Unexpected Bills', icon: '💸' }, 
      { label: 'Job Loss', icon: '📉' }, { label: 'Business Favor', icon: '🏢' }, 
      { label: 'Stewardship', icon: '🤲' }, { label: 'Inflation', icon: '🍞' }
    ]
  },
  { 
    id: 'morning_night', 
    label: 'Daily Rhythms', 
    icon: '🌗', 
    description: 'Prayers for sunrise and sunset.',
    subTopics: [
      { label: 'Morning Energy', icon: '☀️' }, { label: 'Night Peace', icon: '🌙' }, 
      { label: 'Protection', icon: '🏰' }, { label: 'Meal Grace', icon: '🍞' }, 
      { label: 'Travel', icon: '✈️' }, { label: 'Exams', icon: '📝' }
    ]
  }
];

export const LANGUAGES: Language[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'es', name: 'Spanish', nativeName: 'Español' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو' },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' },
  { code: 'fr', name: 'French', nativeName: 'Français' },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
  { code: 'de', name: 'German', nativeName: 'Deutsch' },
  { code: 'it', name: 'Italian', nativeName: 'Italiano' },
  { code: 'ko', name: 'Korean', nativeName: '한국어' },
  { code: 'ja', name: 'Japanese', nativeName: '日本語' }
];
