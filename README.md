# 🔥 Forest Fire Prediction Model

![Python](https://img.shields.io/badge/Python-3.8%2B-blue?style=flat&logo=python)
![ML](https://img.shields.io/badge/Machine%20Learning-Scikit--Learn-orange?style=flat&logo=scikit-learn)
![License](https://img.shields.io/badge/License-MIT-green?style=flat)
![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat)

A machine learning-based system for predicting the likelihood and spread of forest fires using environmental and meteorological data. This model helps authorities take proactive measures to prevent and control wildfires.

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Dataset](#dataset)
- [Project Structure](#project-structure)
- [Installation](#installation)
- [Usage](#usage)
- [Model Architecture](#model-architecture)
- [Results](#results)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

---

## 🌲 Overview

Forest fires pose a significant threat to ecosystems, wildlife, and human settlements. This project leverages machine learning algorithms to predict:

- **Fire Occurrence**: Whether a fire is likely to start in a given area.
- **Fire Spread**: The potential burned area based on weather and environmental conditions.
- **Risk Level**: A risk classification (Low / Medium / High / Critical).

The model is trained on historical fire data combined with meteorological inputs such as temperature, humidity, wind speed, and drought indices.

---

## ✨ Features

- 📊 **Data Preprocessing** – Handles missing values, outliers, and feature scaling.
- 🤖 **Multiple ML Models** – Supports Random Forest, XGBoost, SVM, and Neural Networks.
- 📈 **Interactive Visualizations** – Correlation heatmaps, feature importance plots, and fire risk maps.
- 🔁 **Cross-Validation** – Ensures robust performance evaluation.
- 🌍 **Geo-Spatial Analysis** – Maps fire risk zones using latitude/longitude data.
- 🚨 **Real-Time Prediction** – Accepts live weather inputs for on-the-fly risk assessment.
- 📦 **Model Export** – Trained models exported as `.pkl` or `.joblib` for deployment.

---

## 📂 Dataset

The model uses the following datasets:

| Dataset | Source | Description |
|---|---|---|
| Forest Fires Dataset | [UCI ML Repository](https://archive.ics.uci.edu/ml/datasets/Forest+Fires) | Meteorological data from Montesinho park, Portugal |
| NASA FIRMS | [NASA](https://firms.modaps.eosdis.nasa.gov/) | Active fire detection data |
| NOAA Climate Data | [NOAA](https://www.ncdc.noaa.gov/) | Historical weather data |

### 🔑 Key Features Used

| Feature | Description | Unit |
|---|---|---|
| `temp` | Air temperature | °C |
| `RH` | Relative Humidity | % |
| `wind` | Wind Speed | km/h |
| `rain` | Rainfall | mm |
| `FFMC` | Fine Fuel Moisture Code | Index |
| `DMC` | Duff Moisture Code | Index |
| `DC` | Drought Code | Index |
| `ISI` | Initial Spread Index | Index |
| `area` | Burned area | hectares |

---