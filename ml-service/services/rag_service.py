"""
RAG (Retrieval-Augmented Generation) Service for PyroSage AI Agent.
Combines wildfire knowledge base with LLM reasoning for intelligent analysis.
"""

import logging
import uuid
import numpy as np
from typing import Dict, Optional, List
from datetime import datetime

logger = logging.getLogger(__name__)


class RAGService:
    """
    PyroSage AI Agent backend.
    Uses a knowledge base of wildfire information + Gemini for reasoning.
    """

    def __init__(self, api_key: str):
        self.api_key = api_key
        self.conversations: Dict[str, List[Dict]] = {}
        self.knowledge_base = self._build_knowledge_base()
        self.gemini_model = None

        if api_key:
            # Disabled API connection as requested by user to force dummy offline answers
            self.gemini_model = None
            logger.info("Gemini API connection intentionally disabled. Using offline dummy mode.")
            # try:
            #     import google.generativeai as genai
            #     genai.configure(api_key=api_key)
            #     self.gemini_model = genai.GenerativeModel('gemini-1.5-flash')
            #     logger.info("✅ Gemini client initialized for PyroSage")
            # except Exception as e:
            #     logger.warning(f"Gemini init failed: {e}. Using offline mode.")

    def _build_knowledge_base(self) -> List[Dict]:
        """Build comprehensive wildfire knowledge base for RAG retrieval."""
        return [
            {
                "topic": "fire_weather_index",
                "keywords": ["fwi", "fire weather", "weather index", "fire danger rating"],
                "content": (
                    "The Fire Weather Index (FWI) is a numeric rating of fire intensity. "
                    "It combines temperature, humidity, wind speed, and precipitation into a single metric. "
                    "FWI > 0.7 indicates extreme fire danger. Key contributing factors are "
                    "high temperature (>35°C), low humidity (<20%), strong winds (>30km/h), "
                    "and no recent precipitation. The Canadian FWI system is the most widely used "
                    "globally and includes sub-indices: Fine Fuel Moisture Code (FFMC), "
                    "Duff Moisture Code (DMC), Drought Code (DC), Initial Spread Index (ISI), "
                    "and Buildup Index (BUI)."
                ),
            },
            {
                "topic": "ndvi_vegetation",
                "keywords": ["ndvi", "vegetation", "greenness", "plant health", "fuel load"],
                "content": (
                    "NDVI (Normalized Difference Vegetation Index) measures vegetation health "
                    "using satellite remote sensing. Values range from -1 to 1. Values below 0.2 "
                    "indicate sparse/dead vegetation that acts as dry fuel for wildfires. "
                    "Values above 0.6 indicate healthy green vegetation with higher moisture content. "
                    "Declining NDVI over weeks indicates increasing drought stress and fire susceptibility. "
                    "Paradoxically, areas with moderate NDVI (0.3-0.5) can be most dangerous because "
                    "they have enough biomass to burn but are dry enough to ignite easily."
                ),
            },
            {
                "topic": "wind_fire_spread",
                "keywords": ["wind", "spread", "fire behavior", "wind speed", "wind direction"],
                "content": (
                    "Wind is the most dynamic factor in wildfire behavior and spread. "
                    "Wind speeds above 30 km/h can cause rapid fire spread and make containment "
                    "extremely difficult. Wind affects fire in three ways: (1) it supplies oxygen, "
                    "(2) it pushes flames into unburned fuel, and (3) it carries burning embers "
                    "(spotting) up to several kilometers ahead. Erratic or shifting winds are "
                    "particularly dangerous as they can cause sudden changes in fire direction. "
                    "Diurnal wind patterns (upslope during day, downslope at night) also affect spread. "
                    "Santa Ana winds in California and Foehn winds in Europe are notorious for "
                    "creating extreme fire conditions with hot, dry, gusty conditions."
                ),
            },
            {
                "topic": "temperature_humidity",
                "keywords": ["temperature", "humidity", "heat", "moisture", "relative humidity", "hot"],
                "content": (
                    "Temperature and humidity are fundamental drivers of wildfire risk. "
                    "High temperatures (>35°C) dry out vegetation and lower fuel moisture content. "
                    "Relative humidity below 25% creates critical fire weather conditions. "
                    "The relationship between temperature and humidity determines the Vapour "
                    "Pressure Deficit (VPD), which directly affects how quickly vegetation dries. "
                    "Heatwaves significantly increase fire risk by pre-drying fuels over sustained "
                    "periods. Night-time temperature is also important — when minimum temperatures "
                    "stay high, fuels don't recover moisture overnight. The 'crossover' point "
                    "where temperature exceeds humidity percentage is a red flag for fire danger."
                ),
            },
            {
                "topic": "terrain_topography",
                "keywords": ["slope", "elevation", "terrain", "topography", "aspect", "hill", "mountain"],
                "content": (
                    "Terrain significantly affects wildfire behavior. Fire spreads faster uphill "
                    "because flames preheat fuels above through radiation and convection. "
                    "The rate of spread approximately doubles for every 10 degrees of slope. "
                    "South-facing slopes (in Northern Hemisphere) receive more solar radiation, "
                    "making vegetation drier and more fire-prone. Canyons and chimneys create "
                    "'chimney effects' that accelerate fire spread through funneling. "
                    "Elevation affects fuel type and moisture — higher elevations may have snow "
                    "and wetter conditions, while mid-elevations often have the most fire-prone "
                    "conditions. Ridge-top winds can be significantly stronger than valley winds."
                ),
            },
            {
                "topic": "drought_conditions",
                "keywords": ["drought", "dry", "precipitation", "rain", "water", "moisture deficit"],
                "content": (
                    "Drought is a primary predisposing factor for wildfires. Extended periods "
                    "without precipitation reduce soil moisture, lower water tables, and stress "
                    "vegetation. The Keetch-Byram Drought Index (KBDI) and Palmer Drought "
                    "Severity Index (PDSI) are used to quantify drought conditions. "
                    "Even a single week of hot, dry weather can significantly increase fire risk. "
                    "Multi-year droughts (mega-droughts) are particularly dangerous as they "
                    "kill trees and create massive fuel loads. Drought also reduces water "
                    "availability for firefighting operations. The combination of drought "
                    "and high winds creates the most extreme fire conditions."
                ),
            },
            {
                "topic": "fire_detection_satellites",
                "keywords": ["satellite", "modis", "viirs", "firms", "detection", "remote sensing", "nasa"],
                "content": (
                    "NASA's FIRMS (Fire Information for Resource Management System) provides "
                    "near real-time active fire data from MODIS and VIIRS satellites. "
                    "MODIS (Moderate Resolution Imaging Spectroradiometer) has been operational "
                    "since 2000 and detects fires using thermal infrared bands at 1km resolution. "
                    "VIIRS (Visible Infrared Imaging Radiometer Suite) provides higher resolution "
                    "(375m) fire detection since 2012. Fire Radiative Power (FRP) measures "
                    "fire intensity in megawatts. Brightness temperature above 330K typically "
                    "indicates an active fire. Confidence levels help filter false positives "
                    "from hot surfaces, sun glint, or industrial heat sources."
                ),
            },
            {
                "topic": "fire_spread_modeling",
                "keywords": ["spread", "model", "simulation", "propagation", "cellular automata", "predict spread"],
                "content": (
                    "Fire spread models predict how a wildfire will grow over time. "
                    "The Rothermel model is the foundational physics-based spread model, "
                    "using fuel characteristics, weather, and terrain to calculate rate of spread. "
                    "FARSITE and FlamMap are widely used operational spread simulation tools. "
                    "Cellular automata models divide the landscape into grid cells and apply "
                    "probabilistic spread rules based on fuel, weather, and topography. "
                    "Key factors include: head fire spread (fastest, wind-driven), "
                    "flank fire spread (moderate), and backing fire (slowest, against wind). "
                    "Spot fires from ember transport can cause jumps of 1-10 km."
                ),
            },
            {
                "topic": "emissions_environmental_impact",
                "keywords": ["emissions", "co2", "carbon", "pollution", "air quality", "environment", "smoke"],
                "content": (
                    "Wildfires release massive amounts of CO2, CO, methane, and particulate matter. "
                    "A large wildfire can emit as much CO2 as millions of cars in a year. "
                    "PM2.5 from wildfire smoke causes respiratory and cardiovascular health issues "
                    "hundreds of kilometers downwind. Wildfire smoke can darken skies, reduce "
                    "visibility, and affect air quality for weeks. In 2020, California wildfires "
                    "emitted over 100 million tonnes of CO2. The carbon released may take "
                    "decades to centuries to be resequestered as forests regrow. "
                    "Black carbon (soot) deposited on snow and ice accelerates melting."
                ),
            },
            {
                "topic": "prevention_mitigation",
                "keywords": ["prevent", "mitigation", "defensible space", "firebreak", "prescribed burn", "manage"],
                "content": (
                    "Wildfire prevention and mitigation strategies include: "
                    "(1) Creating defensible space: clearing vegetation 30-100 feet around structures. "
                    "(2) Prescribed/controlled burns: intentionally burning under controlled conditions "
                    "to reduce fuel loads. (3) Mechanical fuel reduction: thinning forests, removing "
                    "dead wood and brush. (4) Firebreaks: strips of cleared land that stop fire spread. "
                    "(5) Building codes: fire-resistant materials, ember-resistant vents. "
                    "(6) Community Wildfire Protection Plans (CWPPs). "
                    "(7) Early warning systems and evacuation planning. "
                    "(8) Public education about fire safety and campfire management."
                ),
            },
            {
                "topic": "climate_change_fires",
                "keywords": ["climate", "climate change", "global warming", "trend", "increasing"],
                "content": (
                    "Climate change is a major driver of increasing wildfire activity worldwide. "
                    "Rising temperatures extend fire seasons by 2-3 months in many regions. "
                    "Earlier snowmelt reduces soil and vegetation moisture earlier in the season. "
                    "More frequent and intense heatwaves create conditions primed for fire. "
                    "Bark beetle outbreaks, exacerbated by warmer winters, kill trees and create "
                    "massive fuel loads. The global area burned has increased significantly "
                    "in boreal forests, western North America, and Mediterranean regions. "
                    "Climate models project 50-100% increases in area burned by 2050 in many regions."
                ),
            },
            {
                "topic": "evacuation_safety",
                "keywords": ["evacuation", "evacuate", "safety", "escape", "route", "shelter", "protect"],
                "content": (
                    "Evacuation planning is critical for wildfire-prone communities. "
                    "Key principles: (1) Know multiple evacuation routes — primary roads may be "
                    "blocked by fire or traffic. (2) Evacuate early — don't wait for mandatory orders. "
                    "(3) Prepare a 'go bag' with essentials, documents, medications. "
                    "(4) Keep vehicle fueled and facing outward. (5) Close all windows and doors. "
                    "(6) Move away from the fire, not parallel to it. "
                    "(7) If trapped in a vehicle, park in a cleared area, close vents, lie on floor. "
                    "(8) If trapped on foot, find a body of water or cleared area, lie face down. "
                    "Evacuation routes should avoid narrow canyons and areas with dense fuel."
                ),
            },
            {
                "topic": "soil_moisture_fuel",
                "keywords": ["soil", "moisture", "fuel moisture", "dead fuel", "live fuel", "dryness"],
                "content": (
                    "Fuel moisture content is the most critical factor determining fire ignition "
                    "and spread. Dead fuel moisture is driven by atmospheric conditions and responds "
                    "within hours to days. Live fuel moisture depends on plant physiology and soil "
                    "water availability. Fine fuels (<6mm diameter) like grass and leaves dry fastest "
                    "and ignite most easily. Heavy fuels (logs, stumps) take longer to dry but "
                    "sustain fire longer. Fuel moisture below 30% (dead) or 80% (live) indicates "
                    "high fire danger. Soil moisture affects root-zone water availability — "
                    "when soil moisture drops below the wilting point, vegetation stress accelerates."
                ),
            },
            {
                "topic": "fire_types_behavior",
                "keywords": ["crown fire", "surface fire", "ground fire", "fire type", "fire behavior", "firestorm"],
                "content": (
                    "Wildfires are classified by the fuel layer they burn: "
                    "(1) Ground fires burn organic material in the soil (peat, roots), "
                    "can smolder for weeks and are difficult to extinguish. "
                    "(2) Surface fires burn ground-level fuels like grass, shrubs, and leaf litter. "
                    "Most common type, spread rate depends on wind and slope. "
                    "(3) Crown fires burn through tree canopy, most dangerous and fastest-spreading. "
                    "Active crown fires can spread at 100+ km/h in extreme conditions. "
                    "Firestorms create their own weather systems with pyrocumulus clouds, "
                    "generating strong updrafts, turbulent winds, and even fire tornadoes."
                ),
            },
            {
                "topic": "risk_factors_combined",
                "keywords": ["risk", "factors", "why", "cause", "reason", "high risk", "extreme risk", "contribute"],
                "content": (
                    "Wildfire risk is determined by the combination of multiple factors: "
                    "WEATHER: High temperature, low humidity, strong winds, no precipitation. "
                    "FUEL: Dry vegetation, high fuel load, low fuel moisture, dead fuel accumulation. "
                    "TOPOGRAPHY: Steep slopes, south-facing aspects, canyons, ridgelines. "
                    "IGNITION: Lightning, human activity, power lines, existing nearby fires. "
                    "DROUGHT: Prolonged dry periods that pre-condition the landscape. "
                    "SEASON: Fire season typically peaks in summer/early fall in temperate regions, "
                    "dry season in tropical regions. "
                    "A single extreme factor rarely causes catastrophic fire — it's the convergence "
                    "of multiple factors simultaneously that creates the most dangerous conditions."
                ),
            },
            {
                "topic": "historical_wildfires",
                "keywords": ["historical", "worst", "largest", "deadliest", "famous", "past fires", "2020", "2023"],
                "content": (
                    "Notable historical wildfires: "
                    "Camp Fire (2018, California): Deadliest in CA history, 85 deaths, destroyed Paradise. "
                    "Black Summer (2019-2020, Australia): 46 million acres burned, 3 billion animals affected. "
                    "Amazon Fires (2019): Over 80,000 fires, massive deforestation. "
                    "Siberian Fires (2021): Burned area larger than Greece, massive CO2 emissions. "
                    "Maui Fire (2023, Hawaii): 100+ deaths, Lahaina destroyed, wind-driven urban fire. "
                    "Canadian Wildfires (2023): Record 45 million acres, smoke reached Europe. "
                    "These events show increasing trend in fire severity linked to climate change, "
                    "drought, and expanding wildland-urban interface."
                ),
            },
        ]

    def _retrieve_relevant_knowledge(self, query: str, top_k: int = 5) -> List[str]:
        """Retrieve most relevant knowledge base entries for a query."""
        query_lower = query.lower()
        scored = []

        for entry in self.knowledge_base:
            score = 0

            # Keyword matching
            for keyword in entry["keywords"]:
                if keyword in query_lower:
                    score += 3

            # Topic matching
            topic_words = entry["topic"].replace("_", " ").split()
            for word in topic_words:
                if word in query_lower:
                    score += 2

            # Content word overlap
            content_words = set(entry["content"].lower().split())
            query_words = set(query_lower.split())
            overlap = len(content_words & query_words)
            score += overlap * 0.5

            if score > 0:
                scored.append((score, entry["content"]))

        scored.sort(key=lambda x: x[0], reverse=True)

        # Always include risk_factors_combined for general queries
        if not scored:
            for entry in self.knowledge_base:
                if entry["topic"] == "risk_factors_combined":
                    scored.append((1, entry["content"]))
                    break

        return [content for _, content in scored[:top_k]]

    def _build_system_prompt(self) -> str:
        """Build the system prompt for PyroSage."""
        return """You are PyroSage 🔥, an expert AI wildfire analyst for the AstraFlare system.

Your role:
- Explain wildfire risk predictions in clear, natural language
- Provide actionable preventive recommendations  
- Analyze environmental factors contributing to fire risk
- Answer questions about wildfire science, history, and safety
- Interpret ML model outputs and explain feature importance
- Provide evacuation guidance when appropriate

Communication style:
- Professional but accessible — avoid excessive jargon
- Use specific numbers and data when available
- Structure responses with clear sections when answering complex questions
- Always prioritize safety in recommendations
- Be honest about uncertainty — wildfire prediction has inherent limitations

When analyzing a specific location:
- Reference the actual weather, vegetation, and fire data provided
- Explain which factors are most concerning and why
- Compare to historical patterns and thresholds
- Suggest specific mitigation actions

Format responses with markdown for readability. Use emojis sparingly for key indicators:
🔴 Extreme risk  🟠 High risk  🟡 Moderate risk  🟢 Low risk
🌡️ Temperature  💧 Humidity  💨 Wind  🌿 Vegetation  📍 Location"""

    def _format_context(self, context: Optional[Dict], location: Optional[Dict]) -> str:
        """Format prediction context into a readable string for the LLM."""
        if not context and not location:
            return ""

        parts = ["\n--- CURRENT DATA CONTEXT ---"]

        if location:
            parts.append(f"📍 Location: ({location.get('latitude', 'N/A')}, {location.get('longitude', 'N/A')})")

        if context:
            if "risk_level" in context:
                level = context["risk_level"].upper()
                emoji = {"LOW": "🟢", "MODERATE": "🟡", "HIGH": "🟠", "EXTREME": "🔴"}.get(level, "⚪")
                parts.append(f"{emoji} Risk Level: {level}")

            if "risk_score" in context:
                parts.append(f"Risk Score: {context['risk_score']:.4f}")

            if "confidence" in context:
                parts.append(f"Model Confidence: {context['confidence']:.1%}")

            if "features" in context:
                parts.append("\nKey Environmental Features:")
                features = context["features"]
                feature_display = {
                    "temperature_c": ("🌡️ Temperature", "°C"),
                    "humidity_pct": ("💧 Humidity", "%"),
                    "wind_speed_kmh": ("💨 Wind Speed", "km/h"),
                    "precipitation_mm": ("🌧️ Precipitation", "mm"),
                    "ndvi": ("🌿 NDVI", ""),
                    "soil_moisture": ("🌱 Soil Moisture", ""),
                    "fire_weather_index": ("🔥 Fire Weather Index", ""),
                    "drought_index": ("☀️ Drought Index", ""),
                    "vegetation_dryness": ("🍂 Vegetation Dryness", ""),
                    "nearby_fire_count": ("📡 Nearby Active Fires", ""),
                    "nearest_fire_dist_km": ("📏 Nearest Fire Distance", "km"),
                    "elevation_m": ("⛰️ Elevation", "m"),
                    "slope_deg": ("📐 Slope", "°"),
                }
                for key, (label, unit) in feature_display.items():
                    if key in features:
                        val = features[key]
                        parts.append(f"  {label}: {val}{unit}")

            if "risk_probabilities" in context:
                parts.append("\nRisk Probabilities:")
                for level, prob in context["risk_probabilities"].items():
                    parts.append(f"  {level}: {prob:.1%}")

            if "model_contributions" in context:
                parts.append("\nModel Contributions:")
                for model_name, contrib in context["model_contributions"].items():
                    if isinstance(contrib, dict):
                        pred = contrib.get("prediction", "N/A")
                        conf = contrib.get("confidence", 0)
                        parts.append(f"  {model_name}: class={pred}, confidence={conf:.2%}")

            if "explainability" in context and context["explainability"]:
                top = context["explainability"].get("top_features", [])
                if top:
                    parts.append("\nTop Contributing Factors (SHAP):")
                    for f in top[:5]:
                        parts.append(f"  • {f['feature']}: importance={f['importance']:.4f}")

        parts.append("--- END CONTEXT ---\n")
        return "\n".join(parts)

    async def query(
        self,
        user_query: str,
        context: Optional[Dict] = None,
        conversation_id: Optional[str] = None,
        location: Optional[Dict] = None,
    ) -> Dict:
        """
        Process a PyroSage query with RAG pipeline.
        1. Retrieve relevant knowledge
        2. Build augmented prompt with context
        3. Generate response via LLM (or offline fallback)
        """

        # Manage conversation
        if not conversation_id:
            conversation_id = str(uuid.uuid4())

        if conversation_id not in self.conversations:
            self.conversations[conversation_id] = []

        # Step 1: Retrieve relevant knowledge
        relevant_docs = self._retrieve_relevant_knowledge(user_query)
        knowledge_text = "\n\n".join(relevant_docs) if relevant_docs else ""

        # Step 2: Build context string
        context_text = self._format_context(context, location)

        # Step 3: Build augmented prompt
        augmented_prompt = f"""Based on the following wildfire knowledge and current data, answer the user's question.

RETRIEVED KNOWLEDGE:
{knowledge_text}

{context_text}

USER QUESTION: {user_query}

Provide a thorough, well-structured answer. If data context is available, reference specific values. 
Include risk assessment, contributing factors, and actionable recommendations where appropriate."""

        # Step 4: Generate response
        if self.gemini_model:
            # Check for custom system instruction in context
            sys_instr = None
            if context and "system_instruction" in context:
                sys_instr = context["system_instruction"]
            else:
                sys_instr = self._build_system_prompt()

            # We pass history separately to _generate_gemini
            history = self.conversations[conversation_id][-6:]
            response_text = await self._generate_gemini(augmented_prompt, history, sys_instr)
        else:
            response_text = self._generate_offline(user_query, context, relevant_docs)

        # Save to conversation history (original user query, not the augmented one)
        self.conversations[conversation_id].append(
            {"role": "user", "content": user_query}
        )
        self.conversations[conversation_id].append(
            {"role": "assistant", "content": response_text}
        )

        # Trim conversation history
        if len(self.conversations[conversation_id]) > 20:
            self.conversations[conversation_id] = self.conversations[conversation_id][-20:]

        # Generate follow-up suggestions
        suggestions = self._generate_suggestions(user_query, context)

        return {
            "response": response_text,
            "conversation_id": conversation_id,
            "sources_used": len(relevant_docs),
            "suggestions": suggestions,
            "timestamp": datetime.utcnow().isoformat(),
            "agent": "PyroSage 🔥",
        }

    async def _generate_gemini(self, prompt: str, history: List[Dict], system_instruction: str) -> str:
        """
        Placeholder for Gemini generation. 
        Connection intentionally removed to focus on robust offline intelligence.
        """
        return "Gemini API connection is currently disabled. Using PyroSage Offline Intelligence engine."

    def _generate_offline(
        self,
        query: str,
        context: Optional[Dict],
        relevant_docs: List[str],
    ) -> str:
        """Generate a high-quality offline response when LLM is unavailable."""
        
        # Extract data for more personalized dummy response
        risk_level = "MODERATE"
        risk_score = 0.45
        features = {}
        
        if context:
            risk_level = context.get("risk_level", "MODERATE").upper()
            risk_score = context.get("risk_score", 0.45)
            features = context.get("features", {})
            
        emoji = {"LOW": "🟢", "MODERATE": "🟡", "HIGH": "🟠", "EXTREME": "🔴"}.get(risk_level, "⚪")
        query_lower = query.lower()

        # --- Risk Assessment Category ---
        if "wildfire risk in my region" in query_lower:
            return (
                f"### 📍 Current Risk Assessment: {risk_level}\n\n"
                f"My latest analysis indicates a **{risk_level}** risk level for your current coordinates. "
                f"This assessment is based on an ensemble of 4 ML models processing current satellite imagery and weather telemetry.\n\n"
                f"- **Risk Score:** {risk_score:.4f}\n"
                f"- **Primary Driver:** {'Vegetation dryness' if risk_score > 0.4 else 'Atmospheric conditions'}\n"
                f"- **Confidence:** High (92.4%)\n\n"
                f"I recommend keeping a close watch on local fire bulletins, as conditions are currently trending towards higher volatility."
            )
        elif "highest risk zones" in query_lower:
            return (
                f"### 🗺️ 72-Hour High Risk Zones\n\n"
                f"Based on the 72-hour forecast horizon, I've identified the following high-risk sectors:\n\n"
                f"1. **Sector Alpha (North-West):** Extreme risk due to severe fuel moisture deficit and forecasted 40km/h gusts.\n"
                f"2. **Sector Gamma (South):** High risk. Steep topography is likely to accelerate any potential ignition.\n"
                f"3. **Foothill Interface:** Moderate but increasing risk as humidity is projected to drop below 15% by Wednesday.\n\n"
                f"Please refer to the 'Live Map' tab for a visual heatmap of these zones."
            )
        elif "factors are contributing most" in query_lower:
            temp = features.get("temperature_c", 35)
            hum = features.get("humidity_pct", 18)
            return (
                f"### 🔥 Key Contributing Factors\n\n"
                f"The primary factors driving the current risk level are:\n\n"
                f"1. **Temperature:** The current heat of {temp}°C is significantly above the seasonal average, causing rapid moisture loss in fine fuels.\n"
                f"2. **Relative Humidity:** At {hum}%, the air is exceptionally dry, making ignition from even small sparks highly probable.\n"
                f"3. **Fuel Accumulation:** Our MODIS satellite analysis shows a high NDVI variance, suggesting significant dead fuel build-up in the understory.\n\n"
                f"These conditions create a 'perfect storm' for rapid, uncontrollable fire spread."
            )
        elif "compare current risk levels with last month" in query_lower:
            return (
                f"### 📊 Monthly Risk Comparison\n\n"
                f"There has been a **significant escalation** in risk since last month:\n\n"
                f"- **Risk Score:** Up 42% compared to the 30-day moving average.\n"
                f"- **Drought Status:** We have transitioned from 'Moderate' to 'Severe' drought status in this timeframe.\n"
                f"- **Vegetation Health:** NDVI has dropped from 0.55 to 0.38, indicating that vegetation has moved from green/moist to brown/combustible.\n\n"
                f"This sharp upward trend is characteristic of the transition into the peak fire season."
            )

        # --- Weather & Climate Category ---
        elif "weather conditions affect fire risk" in query_lower:
            return (
                f"### 🌦️ Weather Impact Analysis\n\n"
                f"The upcoming 5-day forecast will negatively impact the fire profile:\n\n"
                f"- **Heatwave:** A high-pressure 'heat dome' is settling in, with temperatures expected to peak at 38°C on Friday.\n"
                f"- **Wind Shift:** Forecasts show a shift to offshore winds, which typically bring lower humidity and higher wind speeds.\n"
                f"- **Precipitation:** 0% chance of rain for the next 10 days.\n\n"
                f"Expect the risk level to move from **{risk_level}** to **HIGH** within the next 48 hours."
            )
        elif "drought index for california" in query_lower:
            return (
                f"### ☀️ California Drought Index\n\n"
                f"Current statewide drought monitoring shows critical levels:\n\n"
                f"- **KBDI (Keetch-Byram):** Averaging 650/800 across the state, indicating severe soil moisture deficit.\n"
                f"- **PDSI:** -4.2 (Extreme Drought) in the Sierra Nevada and Central Valley sectors.\n"
                f"- **Live Fuel Moisture:** Mixed chaparral is currently at 58%, which is well below the critical threshold for rapid fire spread.\n\n"
                f"This drought legacy means that any fire started will burn with higher intensity and deeper into the soil."
            )
        elif "red flag warnings" in query_lower:
            return (
                f"### 🚩 Active Red Flag Warnings\n\n"
                f"Yes, the National Weather Service has issued Red Flag Warnings for the following areas:\n\n"
                f"- **Northern Sierras:** Active until Friday 8:00 PM due to dry lightning risk.\n"
                f"- **Coastal Ranges:** Active due to 50 km/h gusts and humidity below 15%.\n\n"
                f"A Red Flag Warning means that critical fire weather conditions are either occurring now or will shortly. All outdoor burning should be strictly prohibited."
            )
        elif "wind pattern affect fire spread" in query_lower:
            return (
                f"### 💨 Wind & Topography Interaction\n\n"
                f"In mountainous terrain, wind behavior becomes highly erratic:\n\n"
                f"- **Chimney Effect:** Canyons act as funnels, accelerating wind speeds and drawing fire uphill at explosive rates.\n"
                f"- **Spotting:** Ridgetop winds can carry embers several kilometers, jumping over firebreaks and containment lines.\n"
                f"- **Diurnal Shifts:** During the day, 'upslope' winds push fire toward peaks. At night, 'downslope' winds can push fire back down into valleys toward populated areas.\n\n"
                f"Tactical planning must account for these sudden, dangerous shifts in fire direction."
            )

        # --- Predictions & Analysis Category ---
        elif "caldor fire region" in query_lower:
            return (
                f"### 🔥 Caldor Fire Spread Prediction\n\n"
                f"Running the cellular automata spread model for the Caldor sector results in the following 24-hour projection:\n\n"
                f"- **Growth Potential:** 1,200 to 1,500 additional hectares.\n"
                f"- **Primary Axis:** Extending North-East toward the Tahoe Basin.\n"
                f"- **Critical Infrastructure:** 12 structures in the 'Blue Lake' zone are within the high-probability impact path.\n\n"
                f"Simulation confidence is 88%, assuming current wind patterns hold."
            )
        elif "predict for next week" in query_lower:
            return (
                f"### 📅 Weekly Outlook\n\n"
                f"My long-range ML models project the following for next week:\n\n"
                f"- **Risk Trend:** Increasing. The risk score is expected to climb by 0.12 points.\n"
                f"- **Atmospheric Outlook:** High probability of a dry lightning event on Tuesday.\n"
                f"- **Regional Focus:** The southern grassland interface will move into the 'EXTREME' category as fine fuels reach 100% curing.\n\n"
                f"I recommend completing all planned fuel reduction projects before Monday."
            )
        elif "historical fire patterns" in query_lower:
            return (
                f"### 📚 Seasonal Historical Patterns\n\n"
                f"This season is currently tracking significantly above historical norms:\n\n"
                f"- **Area Burned:** 15% higher than the 10-year average for this date.\n"
                f"- **Frequency:** We have seen 42 'large' fire starts compared to the average of 28.\n"
                f"- **Peak Timing:** Fire activity is peaking approximately 3 weeks earlier than usual due to the record-breaking heatwaves in June.\n\n"
                f"This aligns with the multi-decadal trend of longer, more intense fire seasons."
            )
        elif "model confidence" in query_lower:
            return (
                f"### 🛡️ Model Confidence & Uncertainty\n\n"
                f"The current prediction carries a **91.4% confidence rating**. Here's the breakdown:\n\n"
                f"- **Satellite Data:** High confidence. Recent VIIRS passes have provided cloud-free imagery of the fuel bed.\n"
                f"- **Weather Input:** Moderate confidence. There is some variance between the GFS and ECMWF models regarding wind gusts.\n"
                f"- **Ensemble Agreement:** All 4 models (Gradient Boosting, Transformer, ConvLSTM, Bayesian) are within 5% of each other on the final risk score.\n\n"
                f"The primary source of uncertainty is the local 'micro-climate' variance in the deep canyons."
            )

        # --- Safety & Evacuation Category ---
        elif "evacuation routes near me" in query_lower:
            return (
                f"### 🚨 Local Evacuation Guidance\n\n"
                f"In the event of an evacuation order for your current location, please note the following routes:\n\n"
                f"- **Primary:** Highway 50 Eastbound toward the valley floor.\n"
                f"- **Secondary:** Ridge Road North-West (Clearance for high-clearance vehicles only).\n"
                f"- **Safe Zones:** The Regional Fairgrounds has been designated as the primary temporary refuge area.\n\n"
                f"**Never wait for a mandatory order to leave if you feel threatened.** Smoke and traffic can rapidly degrade evacuation conditions."
            )
        elif "prepare for wildfire season" in query_lower:
            return (
                f"### 📋 Community Preparation Checklist\n\n"
                f"Communities should focus on these three pillars of preparedness:\n\n"
                f"1. **Defensible Space:** Create a 'Lean, Clean, and Green' zone 100 feet around every structure.\n"
                f"2. **Hardening Homes:** Install 1/8 inch metal mesh screens over all vents to prevent ember intrusion—the #1 cause of home loss.\n"
                f"3. **Communication:** Sign up for 'CodeRED' or your local reverse-911 emergency alert system.\n\n"
                f"Preparation during low-risk periods is the most effective way to save lives and property."
            )
        elif "vegetation management" in query_lower:
            return (
                f"### 🌿 Vegetation Management Strategies\n\n"
                f"To effectively reduce fire risk, prioritize these management techniques:\n\n"
                f"- **Limb Up:** Prune tree branches to a height of 6-10 feet to prevent ground fires from climbing into the canopy (ladder fuels).\n"
                f"- **Thinning:** Remove brush and smaller trees to create horizontal spacing between fuel loads.\n"
                f"- **Moisture Retention:** If possible, irrigate high-value zones within 30 feet of structures to maintain live fuel moisture above 100%.\n\n"
                f"Targeted management can reduce fire intensity by up to 70%."
            )
        elif "emission estimates" in query_lower:
            return (
                f"### 🌫️ Active Fire Emissions Analysis\n\n"
                f"Current active fires in the state are producing significant atmospheric load:\n\n"
                f"- **Daily CO2:** Estimated at 1.2 million tonnes.\n"
                f"- **Particulate Matter (PM2.5):** Air quality monitors downwind are recording values of 240+ (Very Unhealthy).\n"
                f"- **Black Carbon:** High concentrations detected in the upper atmosphere, which can travel thousands of miles.\n\n"
                f"We project that smoke impacts will remain severe for the next 48 hours until wind patterns shift."
            )

        # Fallback to the original generic analysis if query doesn't match known patterns
        response = [
            f"## PyroSage Intelligence Analysis 🔥\n",
            f"Based on current environmental telemetry, I have performed a multi-factor analysis.\n",
            f"### {emoji} Risk Assessment: {risk_level} ({risk_score:.1%})\n",
            f"My reasoning engine has identified several critical factors:\n"
        ]
        
        if features:
            temp = features.get("temperature_c", 25)
            humidity = features.get("humidity_pct", 50)
            wind = features.get("wind_speed_kmh", 10)
            
            if temp > 30:
                response.append(f"- **Thermal Stress:** Elevated temperature of {temp}°C is contributing to rapid fuel desiccation.")
            if humidity < 25:
                response.append(f"- **Critical Humidity:** Relative humidity is at a dangerous {humidity}%, significantly lowering the ignition threshold.")
            if wind > 20:
                response.append(f"- **Atmospheric Dynamics:** Sustained winds of {wind} km/h pose a high risk for rapid fire propagation and ember spotting.")
        else:
            response.append("- **Vegetation Moisture:** NDVI values suggest a high concentration of cured, dry fuels in the understory.")
        
        if relevant_docs:
            response.append("\n### 📚 Supporting Science\n")
            response.append(f"> {relevant_docs[0] if relevant_docs else ''}")

        response.append(f"\n---\n*Analysis generated by PyroSage Simulated Intelligence (Offline Mode)*")
        
        return "\n".join(response)

    def _generate_suggestions(self, query: str, context: Optional[Dict]) -> List[str]:
        """Generate follow-up question suggestions."""
        base_suggestions = [
            "What factors contribute most to wildfire risk in this area?",
            "How might this fire spread over the next 24 hours?",
            "What are the recommended evacuation routes?",
            "What is the estimated environmental impact?",
            "How does this compare to historical fire events?",
        ]

        context_suggestions = []
        if context:
            risk = context.get("risk_level", "")
            if risk in ["high", "extreme"]:
                context_suggestions = [
                    "Why is this region classified as high risk?",
                    "What immediate actions should be taken?",
                    "How quickly could conditions change?",
                    "What is the fire spread prediction?",
                ]
            elif risk == "moderate":
                context_suggestions = [
                    "What could push this area to high risk?",
                    "What preventive measures are recommended?",
                    "When is the next weather change expected?",
                ]
            else:
                context_suggestions = [
                    "What keeps this area at low risk?",
                    "Are there any upcoming risk factors?",
                    "What's the seasonal fire risk pattern here?",
                ]

        return (context_suggestions + base_suggestions)[:5]

    def clear_conversation(self, conversation_id: str):
        """Clear a conversation history."""
        if conversation_id in self.conversations:
            del self.conversations[conversation_id]

    def get_conversation(self, conversation_id: str) -> List[Dict]:
        """Get conversation history."""
        return self.conversations.get(conversation_id, [])