const AGRICULTURE_KNOWLEDGE = {

    /*
    ============================================================
    SYSTEM IDENTITY
    ============================================================
    */

    system: {

        name:
            "AgriWeather Intelligent Advisory System",

        version:
            "2.0.0",

        purpose:
            "Provide hyperlocal weather-aware agricultural information, advisories and decision support for farmers, government bodies, FPOs and agricultural field officers.",

        supported_languages: [
            "en",
            "mr",
            "hi"
        ],

        supported_audiences: [
            "farmer",
            "government",
            "fpo",
            "agriculture_officer",
            "general"
        ]
    },


    /*
    ============================================================
    WEATHER RISK KNOWLEDGE
    ============================================================
    */

    WEATHER_RISKS: {

        HEAT_STRESS: {

            category:
                "temperature",

            severity:
                "HIGH",

            keywords: [
                "heat",
                "hot",
                "temperature",
                "heat stress",
                "उष्णता",
                "तापमान",
                "गर्मी"
            ],

            explanation: {

                en:
                    "High temperatures can increase crop water demand and may cause heat stress, particularly in temperature-sensitive crops and during critical crop stages.",

                mr:
                    "जास्त तापमानामुळे पिकांची पाण्याची गरज वाढू शकते आणि विशेषतः तापमानास संवेदनशील पिकांमध्ये तसेच महत्त्वाच्या वाढीच्या अवस्थेत उष्णतेचा ताण निर्माण होऊ शकतो.",

                hi:
                    "अधिक तापमान से फसल की पानी की आवश्यकता बढ़ सकती है और विशेष रूप से तापमान-संवेदनशील फसलों तथा महत्वपूर्ण विकास अवस्थाओं में गर्मी का तनाव बढ़ सकता है।"
            },

            actions: {

                en: [
                    "Monitor the crop during the hottest part of the day.",
                    "Check soil moisture before making irrigation decisions.",
                    "Maintain adequate moisture where irrigation is available.",
                    "Pay additional attention to newly transplanted or temperature-sensitive crops."
                ],

                mr: [
                    "दिवसातील सर्वाधिक उष्ण काळात पिकाची पाहणी करा.",
                    "सिंचनाचा निर्णय घेण्यापूर्वी जमिनीतील ओलावा तपासा.",
                    "सिंचनाची सुविधा असल्यास आवश्यक ओलावा राखा.",
                    "नुकतीच लागवड केलेली किंवा तापमानास संवेदनशील पिकांकडे विशेष लक्ष द्या."
                ],

                hi: [
                    "दिन के सबसे गर्म समय में फसल की निगरानी करें।",
                    "सिंचाई का निर्णय लेने से पहले मिट्टी की नमी जांचें।",
                    "सिंचाई उपलब्ध होने पर आवश्यक नमी बनाए रखें।",
                    "नई रोपाई या तापमान-संवेदनशील फसलों पर विशेष ध्यान दें।"
                ]
            }
        },


        HEAVY_RAIN: {

            category:
                "rainfall",

            severity:
                "HIGH",

            keywords: [
                "heavy rain",
                "heavy rainfall",
                "flood",
                "waterlogging",
                "जोरदार पाऊस",
                "अतिवृष्टी",
                "जड पाऊस",
                "भारी वर्षा"
            ],

            explanation: {

                en:
                    "Heavy rainfall can increase the risk of waterlogging, soil erosion, crop lodging and disruption of field operations.",

                mr:
                    "जोरदार पावसामुळे शेतात पाणी साचणे, मातीची धूप, पिके आडवी पडणे आणि शेतीतील कामांमध्ये अडथळे निर्माण होण्याचा धोका वाढू शकतो.",

                hi:
                    "भारी वर्षा से जलभराव, मिट्टी का कटाव, फसल के गिरने और कृषि कार्यों में बाधा का जोखिम बढ़ सकता है।"
            },

            actions: {

                en: [
                    "Avoid unnecessary irrigation before or during expected heavy rainfall.",
                    "Check field drainage.",
                    "Monitor low-lying agricultural areas.",
                    "Inspect crops after rainfall for waterlogging or physical damage."
                ],

                mr: [
                    "जोरदार पावसापूर्वी किंवा पावसादरम्यान अनावश्यक सिंचन टाळा.",
                    "शेतातील पाण्याचा निचरा व्यवस्थित आहे का ते तपासा.",
                    "सखल भागातील शेतांवर विशेष लक्ष ठेवा.",
                    "पावसानंतर पाणी साचले आहे का किंवा पिकाचे नुकसान झाले आहे का ते तपासा."
                ],

                hi: [
                    "भारी वर्षा से पहले या दौरान अनावश्यक सिंचाई से बचें।",
                    "खेत की जल निकासी जांचें।",
                    "निचले कृषि क्षेत्रों पर विशेष निगरानी रखें।",
                    "वर्षा के बाद जलभराव और फसल क्षति की जांच करें।"
                ]
            }
        },


        STRONG_WIND: {

            category:
                "wind",

            severity:
                "HIGH",

            keywords: [
                "wind",
                "strong wind",
                "storm",
                "high wind",
                "वारा",
                "वादळ",
                "तेज हवा",
                "आंधी"
            ],

            explanation: {

                en:
                    "Strong winds can cause lodging, physical damage, structural damage and difficulties during spraying and other field operations.",

                mr:
                    "वेगवान वाऱ्यामुळे पिके आडवी पडणे, पिकांचे किंवा शेतीतील संरचनांचे नुकसान होणे तसेच फवारणीसारख्या कामांमध्ये अडचणी निर्माण होऊ शकतात.",

                hi:
                    "तेज हवाएं फसल के गिरने, फसल या कृषि संरचनाओं को नुकसान पहुंचाने तथा छिड़काव जैसे कार्यों में कठिनाई पैदा कर सकती हैं।"
            },

            actions: {

                en: [
                    "Monitor vulnerable crops and agricultural structures.",
                    "Avoid spraying during strong winds.",
                    "Inspect crops after a strong-wind event.",
                    "Follow local weather warnings when severe conditions are expected."
                ],

                mr: [
                    "संवेदनशील पिके आणि शेतीतील संरचनांची पाहणी करा.",
                    "जोरदार वाऱ्यात फवारणी टाळा.",
                    "वेगवान वाऱ्यानंतर पिकांची पाहणी करा.",
                    "तीव्र हवामान असल्यास स्थानिक हवामान इशाऱ्यांचे पालन करा."
                ],

                hi: [
                    "संवेदनशील फसलों और कृषि संरचनाओं की निगरानी करें।",
                    "तेज हवा के दौरान छिड़काव से बचें।",
                    "तेज हवा के बाद फसल की जांच करें।",
                    "गंभीर मौसम की स्थिति में स्थानीय मौसम चेतावनियों का पालन करें।"
                ]
            }
        },


        HIGH_HUMIDITY: {

            category:
                "humidity",

            severity:
                "MEDIUM",

            keywords: [
                "humidity",
                "humid",
                "moisture",
                "आर्द्रता",
                "ओलावा",
                "humidity percentage"
            ],

            explanation: {

                en:
                    "High relative humidity reduces atmospheric drying and can create conditions favorable to certain fungal and moisture-related crop problems.",

                mr:
                    "जास्त सापेक्ष आर्द्रतेमुळे वातावरणातील वाळण्याचा वेग कमी होऊ शकतो आणि काही बुरशीजन्य व ओलाव्याशी संबंधित पिकांच्या समस्यांसाठी परिस्थिती अनुकूल होऊ शकते.",

                hi:
                    "अधिक सापेक्ष आर्द्रता वातावरण में सुखाने की प्रक्रिया को धीमा कर सकती है और कुछ फफूंद तथा नमी-संबंधी फसल समस्याओं के लिए अनुकूल परिस्थितियां बना सकती है।"
            }
        },


        FUNGAL_RISK: {

            category:
                "crop_health",

            severity:
                "MEDIUM",

            keywords: [
                "fungus",
                "fungal",
                "fungal disease",
                "disease risk",
                "बुरशी",
                "बुरशीजन्य रोग",
                "फफूंद",
                "रोग"
            ],

            explanation: {

                en:
                    "A combination of high humidity, suitable temperature and moisture can create weather conditions favorable for fungal development. Weather-based risk does not confirm disease.",

                mr:
                    "जास्त आर्द्रता, योग्य तापमान आणि ओलावा यांचे संयोजन बुरशीजन्य समस्यांसाठी अनुकूल हवामान तयार करू शकते. हवामानावर आधारित धोका म्हणजे रोगाची खात्री झालेली आहे असे नाही.",

                hi:
                    "अधिक आर्द्रता, उपयुक्त तापमान और नमी का संयोजन फफूंद संबंधी समस्याओं के लिए अनुकूल मौसम बना सकता है। मौसम-आधारित जोखिम का अर्थ रोग की पुष्टि नहीं है।"
            },

            safety:
                "Never diagnose a crop disease from weather data alone."
        },


        SPRAYING_UNFAVORABLE: {

            category:
                "field_operation",

            severity:
                "MEDIUM",

            keywords: [
                "spray",
                "spraying",
                "pesticide spray",
                "फवारणी",
                "फवारणी कधी",
                "छिड़काव",
                "spray weather"
            ],

            explanation: {

                en:
                    "Rain and strong winds can reduce the effectiveness of some crop spraying operations and increase drift risk.",

                mr:
                    "पाऊस आणि जोरदार वारा काही पिकांच्या फवारणीच्या परिणामकारकतेवर परिणाम करू शकतात आणि फवारणीच्या थेंबांचे वाहून जाण्याचे प्रमाण वाढवू शकतात.",

                hi:
                    "बारिश और तेज हवा कुछ फसल छिड़काव कार्यों की प्रभावशीलता को कम कर सकती है और छिड़काव के बहाव का जोखिम बढ़ा सकती है।"
            },

            safety:
                "Never recommend a pesticide, dose or chemical combination unless it comes from an approved agricultural source."
        },


        EXCESS_MOISTURE: {

            category:
                "soil",

            severity:
                "MEDIUM",

            keywords: [
                "waterlogging",
                "soil moisture",
                "wet soil",
                "excess water",
                "पाणी साचणे",
                "जमिनीतील ओलावा",
                "जलभराव",
                "मिट्टी की नमी"
            ]
        },


        LOW_RAINFALL: {

            category:
                "water_management",

            severity:
                "MEDIUM",

            keywords: [
                "low rainfall",
                "less rain",
                "no rain",
                "dry weather",
                "कमी पाऊस",
                "पाऊस कमी",
                "कम बारिश",
                "सूखा"
            ],

            actions: {

                en: [
                    "Monitor soil moisture.",
                    "Plan irrigation according to crop requirement and available water.",
                    "Prioritize critical crop stages where water is limited.",
                    "Continue monitoring the forecast for changes."
                ],

                mr: [
                    "जमिनीतील ओलावा तपासा.",
                    "पिकाची गरज आणि उपलब्ध पाण्यानुसार सिंचनाचे नियोजन करा.",
                    "पाणी मर्यादित असल्यास पिकाच्या महत्त्वाच्या अवस्थांना प्राधान्य द्या.",
                    "हवामानाच्या अंदाजातील बदलांकडे लक्ष ठेवा."
                ],

                hi: [
                    "मिट्टी की नमी की निगरानी करें।",
                    "फसल की आवश्यकता और उपलब्ध पानी के अनुसार सिंचाई की योजना बनाएं।",
                    "पानी सीमित होने पर फसल की महत्वपूर्ण अवस्थाओं को प्राथमिकता दें।",
                    "पूर्वानुमान में बदलाव की निगरानी करते रहें।"
                ]
            }
        },


        LOW_TEMPERATURE: {

            category:
                "temperature",

            severity:
                "HIGH",

            keywords: [
                "cold",
                "low temperature",
                "frost",
                "ठंड",
                "कमी तापमान",
                "थंडी",
                "पाला"
            ],

            safety:
                "Do not claim frost damage without appropriate local observations."
        }
    },


    /*
    ============================================================
    GENERAL AGRICULTURE TOPICS
    ============================================================
    */

    TOPICS: {

        WEATHER_FORECAST: {

            description:
                "Questions about current, hourly or daily weather forecasts.",

            examples: [
                "What is the weather tomorrow?",
                "Will it rain today?",
                "आज पाऊस पडेल का?",
                "उद्या हवामान कसे असेल?",
                "कल बारिश होगी क्या?"
            ]
        },


        TEMPERATURE: {

            description:
                "Understanding temperature and crop impact.",

            examples: [
                "Is 35 degree temperature dangerous?",
                "What temperature is good for crops?",
                "35°C म्हणजे पिकासाठी धोकादायक आहे का?",
                "तापमान वाढल्याने पिकावर काय परिणाम होतो?"
            ]
        },


        RAINFALL: {

            description:
                "Rainfall interpretation and agricultural implications.",

            examples: [
                "Is 50 mm rain heavy?",
                "How much rainfall is enough?",
                "50 mm पाऊस म्हणजे किती?",
                "५० मिमी पाऊस जास्त आहे का?"
            ]
        },


        HUMIDITY: {

            description:
                "Relative humidity interpretation.",

            examples: [
                "What does 90% humidity mean?",
                "Why is high humidity dangerous?",
                "90% आर्द्रता म्हणजे काय?",
                "आर्द्रता जास्त असल्यास काय होते?"
            ]
        },


        IRRIGATION: {

            description:
                "Weather-informed irrigation planning.",

            examples: [
                "Should I irrigate today?",
                "Should I water my onion crop?",
                "आज सिंचन करावे का?",
                "कांद्याला आज पाणी द्यावे का?",
                "क्या आज सिंचाई करनी चाहिए?"
            ]
        },


        SPRAYING: {

            description:
                "Weather suitability for crop spraying.",

            examples: [
                "Can I spray today?",
                "Is tomorrow good for spraying?",
                "आज फवारणी करावी का?",
                "उद्या फवारणीसाठी हवामान योग्य आहे का?",
                "क्या आज छिड़काव करना ठीक है?"
            ]
        },


        CROP_HEALTH: {

            description:
                "Weather-related crop health risk.",

            examples: [
                "Why are my leaves wet?",
                "Is this weather favorable for fungal disease?",
                "या हवामानामुळे बुरशी होऊ शकते का?",
                "फफूंद का खतरा कब बढ़ता है?"
            ]
        },


        SOIL_MOISTURE: {

            description:
                "Soil moisture and field water conditions.",

            examples: [
                "How do I know whether soil needs water?",
                "How does rain affect soil moisture?",
                "जमिनीत पाणी आहे की नाही कसे समजेल?"
            ]
        },


        HARVESTING: {

            description:
                "Weather considerations around harvesting.",

            examples: [
                "Can I harvest tomorrow?",
                "Will rain affect harvesting?",
                "पावसापूर्वी काढणी करावी का?",
                "उद्या काढणी करणे योग्य आहे का?"
            ]
        },


        STORAGE: {

            description:
                "Weather-related storage considerations.",

            examples: [
                "Can humid weather affect stored produce?",
                "How should I protect harvested produce during rain?",
                "जास्त आर्द्रतेचा साठवलेल्या मालावर परिणाम होतो का?"
            ]
        },


        TRANSPORT: {

            description:
                "Weather impacts on agricultural logistics.",

            examples: [
                "Will rain affect transportation?",
                "Should our FPO change collection timing?",
                "पावसामुळे शेतमाल वाहतुकीवर परिणाम होईल का?"
            ]
        },


        GOVERNMENT_RESPONSE: {

            description:
                "Agricultural weather intelligence for government and field officers.",

            examples: [
                "Which villages are at highest risk?",
                "How many Gram Panchayats have heavy rainfall risk?",
                "Which areas should officers inspect first?",
                "Which farmer clusters need an alert?"
            ]
        },


        FPO_OPERATIONS: {

            description:
                "Weather-informed FPO planning.",

            examples: [
                "Should we change collection schedules?",
                "Which crop clusters are affected?",
                "Should transport be rescheduled?"
            ]
        }
    },


    /*
    ============================================================
    GENERAL CONVERSATION INTENTS
    ============================================================
    */

    INTENTS: {

        WEATHER_QUERY: {

            description:
                "User wants to understand weather conditions.",

            requires_live_weather:
                true
        },


        AGRICULTURAL_ADVICE: {

            description:
                "User wants practical crop-management information.",

            requires_crop_context:
                "sometimes"
        },


        EXPLAIN_ALERT: {

            description:
                "User wants to understand why an alert was generated.",

            requires_risk_engine:
                true
        },


        COMPARE_LOCATIONS: {

            description:
                "User wants to compare weather or agricultural risk across locations.",

            requires_multiple_locations:
                true
        },


        EXPLAIN_WEATHER_VALUE: {

            description:
                "User wants to understand temperature, humidity, rainfall or wind values."
        },


        FIELD_OPERATION: {

            description:
                "User wants to know whether a field activity is suitable under current weather."
        },


        GENERAL_AGRICULTURE: {

            description:
                "General agriculture question that does not require a specific weather forecast."
        },


        GOVERNMENT_ANALYTICS: {

            description:
                "Government or agricultural department wants aggregated risk information."
        },


        FPO_ANALYTICS: {

            description:
                "FPO wants crop-cluster, collection, logistics or weather risk information."
        },


        UNKNOWN: {

            description:
                "Question cannot be safely classified."
        }
    },


    /*
    ============================================================
    RESPONSE RULES
    ============================================================
    */

    RESPONSE_POLICY: {

        general: [

            "Answer the user's actual question directly.",
            "Do not unnecessarily repeat the entire weather dataset.",
            "Use the user's selected language.",
            "Use simple language for farmers.",
            "Use technical terminology only when useful.",
            "Explain numbers when the user asks what they mean.",
            "Clearly distinguish forecast from observed weather.",
            "Clearly distinguish weather risk from confirmed crop damage.",
            "Do not fabricate missing weather data.",
            "Do not pretend to have live weather data if none was supplied.",
            "When live data is required but unavailable, clearly state that current data is needed."
        ],


        farmer: [

            "Prioritize practical actions.",
            "Keep the answer understandable.",
            "Mention what to monitor.",
            "Avoid unnecessary technical jargon.",
            "Do not overwhelm the farmer with unrelated information."
        ],


        government: [

            "Emphasize affected locations.",
            "Highlight severity and evidence.",
            "Identify priority areas when data is available.",
            "Separate automated risk detection from field verification.",
            "Do not claim that government action has been authorized."
        ],


        agriculture_officer: [

            "Highlight field verification.",
            "Identify relevant weather indicators.",
            "Explain why an area was flagged.",
            "Suggest monitoring priorities rather than unsupported interventions."
        ],


        fpo: [

            "Consider crop clusters.",
            "Consider collection timing.",
            "Consider transportation conditions.",
            "Consider storage and post-harvest exposure.",
            "Avoid unsupported commercial decisions."
        ]
    },


    /*
    ============================================================
    SAFETY
    ============================================================
    */

    SAFETY: {

        prohibited: [

            "Do not diagnose plant disease solely from weather data.",
            "Do not prescribe pesticide dosage.",
            "Do not recommend chemical mixtures.",
            "Do not recommend restricted chemicals.",
            "Do not fabricate government schemes.",
            "Do not fabricate crop losses.",
            "Do not fabricate rainfall measurements.",
            "Do not fabricate weather forecasts.",
            "Do not guarantee crop yield.",
            "Do not guarantee that a crop will be safe.",
            "Do not give financial guarantees.",
            "Do not claim emergency conditions without supporting data."
        ],


        preferred_language: [

            "Weather conditions indicate increased risk.",
            "Monitor the crop for signs.",
            "Based on the available forecast.",
            "Field verification is recommended.",
            "Follow local agricultural guidance.",
            "The available data suggests."
        ]
    }
};


/*
================================================================
APPROVED WEATHER ADVISORY TEMPLATES
================================================================
*/

const TEMPLATES = {

    HEAT_STRESS: {

        severity: "HIGH",

        category: "temperature",

        farmer: {

            en: {
                title: "Heat stress risk",

                message:
                    "High temperature conditions may increase crop water demand and heat stress. Monitor the crop during the hottest part of the day and check soil moisture before deciding on irrigation."
            },

            mr: {
                title: "उष्णतेमुळे पिकांवर ताण येण्याची शक्यता",

                message:
                    "जास्त तापमानामुळे पिकांची पाण्याची गरज आणि उष्णतेचा ताण वाढू शकतो. दिवसातील सर्वाधिक उष्ण काळात पिकाची पाहणी करा आणि सिंचनाचा निर्णय घेण्यापूर्वी जमिनीतील ओलावा तपासा."
            },

            hi: {
                title: "गर्मी के कारण फसल पर तनाव का खतरा",

                message:
                    "अधिक तापमान से फसल की पानी की आवश्यकता और गर्मी का तनाव बढ़ सकता है। दिन के सबसे गर्म समय में फसल की निगरानी करें और सिंचाई का निर्णय लेने से पहले मिट्टी की नमी जांचें।"
            }
        }
    },


    HEAVY_RAIN: {

        severity: "HIGH",

        category: "rainfall",

        farmer: {

            en: {
                title: "Heavy rainfall risk",

                message:
                    "Heavy rainfall is expected. Avoid unnecessary irrigation, check field drainage and monitor low-lying areas for waterlogging."
            },

            mr: {
                title: "जोरदार पावसाचा धोका",

                message:
                    "जोरदार पावसाची शक्यता आहे. अनावश्यक सिंचन टाळा, शेतातील पाण्याचा निचरा तपासा आणि सखल भागात पाणी साचत आहे का ते पाहा."
            },

            hi: {
                title: "भारी वर्षा का खतरा",

                message:
                    "भारी वर्षा की संभावना है। अनावश्यक सिंचाई से बचें, खेत की जल निकासी जांचें और निचले क्षेत्रों में जलभराव की निगरानी करें।"
            }
        }
    },


    STRONG_WIND: {

        severity: "HIGH",

        category: "wind",

        farmer: {

            en: {
                title: "Strong wind risk",

                message:
                    "Strong winds are expected. Monitor vulnerable crops and agricultural structures and avoid spraying during strong winds."
            },

            mr: {
                title: "वेगवान वाऱ्याचा धोका",

                message:
                    "वेगवान वाऱ्याची शक्यता आहे. संवेदनशील पिके आणि शेतीतील संरचनांची पाहणी करा आणि जोरदार वाऱ्यात फवारणी टाळा."
            },

            hi: {
                title: "तेज हवा चलने का खतरा",

                message:
                    "तेज हवाओं की संभावना है। संवेदनशील फसलों और कृषि संरचनाओं की निगरानी करें तथा तेज हवा के दौरान छिड़काव से बचें।"
            }
        }
    },


    HIGH_HUMIDITY: {

        severity: "MEDIUM",

        category: "humidity",

        farmer: {

            en: {
                title: "High humidity conditions",

                message:
                    "High humidity is expected. Monitor crops for moisture-related problems and signs of fungal development, particularly when wet conditions persist."
            },

            mr: {
                title: "जास्त आर्द्रतेची स्थिती",

                message:
                    "हवेतील आर्द्रता जास्त राहण्याची शक्यता आहे. सतत ओलसर परिस्थिती असल्यास पिकांमध्ये ओलाव्याशी संबंधित समस्या किंवा बुरशीजन्य लक्षणे दिसतात का ते तपासा."
            },

            hi: {
                title: "अधिक आर्द्रता की स्थिति",

                message:
                    "अधिक आर्द्रता रहने की संभावना है। लगातार गीली परिस्थितियों में फसल में नमी से संबंधित समस्याओं या फफूंद के लक्षणों की निगरानी करें।"
            }
        }
    },


    FUNGAL_RISK: {

        severity: "MEDIUM",

        category: "crop_health",

        farmer: {

            en: {
                title: "Weather favorable for fungal development",

                message:
                    "The combination of humidity, temperature and moisture may favor fungal development. Inspect the crop regularly for symptoms. Weather-based risk does not confirm disease."
            },

            mr: {
                title: "बुरशीजन्य समस्यांसाठी अनुकूल हवामान",

                message:
                    "आर्द्रता, तापमान आणि ओलाव्याच्या परिस्थितीमुळे बुरशीजन्य समस्या वाढण्यास अनुकूल वातावरण निर्माण होऊ शकते. पिकाची नियमित पाहणी करा. हवामानावर आधारित धोका म्हणजे रोगाची खात्री झालेली नाही."
            },

            hi: {
                title: "फफूंद विकास के लिए अनुकूल मौसम",

                message:
                    "आर्द्रता, तापमान और नमी की स्थिति फफूंद के विकास के लिए अनुकूल हो सकती है। फसल की नियमित जांच करें। मौसम-आधारित जोखिम रोग की पुष्टि नहीं है।"
            }
        }
    },


    SPRAYING_UNFAVORABLE: {

        severity: "MEDIUM",

        category: "field_operation",

        farmer: {

            en: {
                title: "Weather may be unfavorable for spraying",

                message:
                    "Rainfall or strong winds may reduce the effectiveness of some spraying operations. Avoid spraying during rainfall or strong winds and follow the product label and local agricultural guidance."
            },

            mr: {
                title: "फवारणीसाठी हवामान प्रतिकूल असू शकते",

                message:
                    "पाऊस किंवा जोरदार वारा काही फवारणीच्या कामांची परिणामकारकता कमी करू शकतो. पाऊस किंवा जोरदार वारा असताना फवारणी टाळा आणि उत्पादनाच्या लेबलवरील तसेच स्थानिक कृषी मार्गदर्शनाचे पालन करा."
            },

            hi: {
                title: "छिड़काव के लिए मौसम प्रतिकूल हो सकता है",

                message:
                    "बारिश या तेज हवा कुछ छिड़काव कार्यों की प्रभावशीलता कम कर सकती है। बारिश या तेज हवा के दौरान छिड़काव से बचें और उत्पाद के लेबल तथा स्थानीय कृषि सलाह का पालन करें।"
            }
        }
    },


    EXCESS_MOISTURE: {

        severity: "MEDIUM",

        category: "soil",

        farmer: {

            en: {
                title: "Excess soil moisture risk",

                message:
                    "Persistent wet conditions may increase crop stress. Check field drainage and avoid additional irrigation until soil moisture conditions improve."
            },

            mr: {
                title: "जमिनीत जास्त ओलावा राहण्याचा धोका",

                message:
                    "सतत ओलसर परिस्थितीमुळे पिकावर ताण येऊ शकतो. शेतातील पाण्याचा निचरा तपासा आणि जमिनीतील ओलावा कमी होईपर्यंत अतिरिक्त सिंचन टाळा."
            },

            hi: {
                title: "मिट्टी में अधिक नमी का खतरा",

                message:
                    "लगातार गीली परिस्थितियों से फसल पर तनाव बढ़ सकता है। खेत की जल निकासी जांचें और मिट्टी की नमी कम होने तक अतिरिक्त सिंचाई से बचें।"
            }
        }
    },


    LOW_RAINFALL: {

        severity: "MEDIUM",

        category: "water_management",

        farmer: {

            en: {
                title: "Low rainfall condition",

                message:
                    "Rainfall is expected to remain low. Monitor soil moisture and plan irrigation according to crop requirement, crop stage and available water."
            },

            mr: {
                title: "कमी पावसाची शक्यता",

                message:
                    "पावसाचे प्रमाण कमी राहण्याची शक्यता आहे. जमिनीतील ओलावा तपासा आणि पिकाची गरज, पिकाची अवस्था व उपलब्ध पाण्यानुसार सिंचनाचे नियोजन करा."
            },

            hi: {
                title: "कम वर्षा की स्थिति",

                message:
                    "वर्षा कम रहने की संभावना है। मिट्टी की नमी की निगरानी करें और फसल की आवश्यकता, अवस्था तथा उपलब्ध पानी के अनुसार सिंचाई की योजना बनाएं।"
            }
        }
    },


    LOW_TEMPERATURE: {

        severity: "HIGH",

        category: "temperature",

        farmer: {

            en: {
                title: "Low-temperature risk",

                message:
                    "Very low temperatures are expected. Monitor temperature-sensitive crops and follow locally recommended protective practices."
            },

            mr: {
                title: "कमी तापमानाचा धोका",

                message:
                    "अतिशय कमी तापमानाची शक्यता आहे. कमी तापमानास संवेदनशील पिकांची पाहणी करा आणि स्थानिक कृषी मार्गदर्शनानुसार संरक्षणात्मक उपाय करा."
            },

            hi: {
                title: "कम तापमान का खतरा",

                message:
                    "बहुत कम तापमान की संभावना है। कम तापमान के प्रति संवेदनशील फसलों की निगरानी करें और स्थानीय कृषि सलाह के अनुसार सुरक्षात्मक उपाय अपनाएं।"
            }
        }
    },


    SAFE_WEATHER: {

        severity: "LOW",

        category: "general",

        farmer: {

            en: {
                title: "Weather conditions are generally favorable",

                message:
                    "No major weather-related agricultural risk has been detected from the available forecast. Continue normal monitoring of the crop and local field conditions."
            },

            mr: {
                title: "हवामानाची स्थिती सर्वसाधारणपणे अनुकूल",

                message:
                    "उपलब्ध अंदाजानुसार सध्या हवामानाशी संबंधित मोठा कृषी धोका आढळलेला नाही. पिकाची आणि स्थानिक शेत परिस्थितीची नियमित पाहणी सुरू ठेवा."
            },

            hi: {
                title: "मौसम की स्थिति सामान्यतः अनुकूल",

                message:
                    "उपलब्ध पूर्वानुमान के अनुसार फिलहाल मौसम से संबंधित कोई बड़ा कृषि जोखिम नहीं पाया गया है। फसल और स्थानीय खेत की स्थिति की नियमित निगरानी जारी रखें।"
            }
        }
    }
};


/*
================================================================
UTILITY FUNCTIONS
================================================================
*/

function getRiskKnowledge(code) {

    return AGRICULTURE_KNOWLEDGE
        .WEATHER_RISKS[code] || null;
}


function getTemplate(code) {

    return TEMPLATES[code] || null;
}


function getTopicKnowledge(topic) {

    return AGRICULTURE_KNOWLEDGE
        .TOPICS[topic] || null;
}


function getIntent(intent) {

    return AGRICULTURE_KNOWLEDGE
        .INTENTS[intent] || null;
}


function getLanguageName(language) {

    const names = {

        en: "English",

        mr: "Marathi",

        hi: "Hindi"
    };

    return names[language] || "English";
}


function getAudiencePolicy(audience) {

    return AGRICULTURE_KNOWLEDGE
        .RESPONSE_POLICY[audience]
        ||
        AGRICULTURE_KNOWLEDGE
            .RESPONSE_POLICY.general;
}


module.exports = {

    AGRICULTURE_KNOWLEDGE,

    TEMPLATES,

    getRiskKnowledge,

    getTemplate,

    getTopicKnowledge,

    getIntent,

    getLanguageName,

    getAudiencePolicy
};