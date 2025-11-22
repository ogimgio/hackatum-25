# SiXT Hackathon Project – Automated Sales Agent for Car Rental Upselling

## Overview

This project was built for the SiXT Hackathon with the goal of automating the sales agent responsible for concluding the car rental process. Specifically, we focus on mimicking the human approach to upselling/ upgrading vehicles and offering protection insurance options.

Our solution simulates a natural and persuasive interaction similar to what a customer would experience with a real SiXT sales representative.

---

## Core Concept

Our upselling strategy is based on three main pillars:

### 1. **Human‑like Interaction via a Live Avatar**

Traditional UI interactions rely on buttons and static elements, which create a barrier in the sales dynamic. Instead, we use a live human‑like avatar to replicate the experience of speaking with an in‑person sales agent.

### 2. **Enhanced Booking UI for Better Customer Profiling**

During the initial booking flow, we collect additional customer information (such as travel needs, luggage size, and budget). These details allow the upselling avatar to tailor the conversation later.

### 3. **Personalised Persuasion Based on Customer Profile**

The avatar adapts its wording and sales pitch depending on who the customer is and what constraints they have. For example:

* A budget‑sensitive customer may be convinced by highlighting the high costs of potential accidents.
* A wealthy customer may respond better to premium convenience (e.g., fast vehicle replacement on vacation).

---

## System Workflow

### 1. **Booking Phase (Frontend UI)**

We built a website containing both:

* The booking page
* The key‑collection page (used later during upselling)

#### **Booking Interface Flow**

Instead of immediately showing car models, we first ask the user a set of guiding questions:

* Number of passengers
* Preferred number of doors
* Luggage size (light / medium / heavy)
* Budget

After submitting this information, the user sees a list of suggested vehicles and selects one. The main goal of this first page is *not* recommendation accuracy, but collecting useful context for the upselling model.

### Structure

The user-facing application manages the three-step flow:

- **`BookingForm.tsx`**: A component that gathers initial **Client Data** (Name, Age), **Reservation Data** (Location), **Preferences** (Passengers, Doors, Luggage, Budget, Transmission), and **Add-ons** (GPS, Baby Seat, etc.). This data is crucial for profiling.
- **`CarSelection.tsx`**: Displays the initially selected car and available alternatives based on the pre-submitted preferences. Once a preferred car is selected here, the system moves to the final step.
- **`WhisperDIDAgent.tsx`**: The core component for the live interaction. It renders the **D-ID live avatar** and handles the user's audio input using OpenAI's **Whisper** for transcription.
- **`app/api/call-agent/route.ts`**: A Next.js API route that handles the **escalation to a real human agent**. It uses **Twilio** to initiate a phone call, informing the human agent of the client's name and the reason for the escalation.
- **`backendLogic.ts`**: The client-side business logic driver.
    - **`getInitialOffers`**: Responsible for taking the `BookingContext` and calling the external FastAPI endpoint to fetch the personalized upsell and protection offers.
    - **`processUserResponse`**: The core AI logic. It orchestrates the flow by calling **OpenAI GPT-4o** to classify the user's intent, and based on that, determines the **next conversational state** (`FlowState`) and the virtual agent's **next line of dialogue**.

### 2. **Backend (FastAPI Server)**

The Python backend is a lightweight API that handles all business logic and data processing.

- **`utils.py`**: A helper module responsible for interacting with external SiXT APIs (`hackatum25.sixt.io`).
    - It fetches raw vehicle/protection data.
    - It **simplifies** this raw data into a more usable format (e.g., `simplify_vehicles`, `simplify_protections`), which is then saved locally to avoid repetitive API calls.
- **`server.py`**: The main FastAPI application.
    - **Data Filtering**: Contains the core logic (`filter_cars` and `select_protection`) to determine the best **upsell car option** and the most suitable **protection package** based on the customer's budget and preferences.
    - **API Endpoint**: The `/api/booking/offer` endpoint takes the comprehensive `BookingRequest` and returns the two best car offers (upsell and normal) and the tailored protection package. This information is used by the frontend agent to form the personalized sales pitch.

## Key‑Collection Day Flow (Avatar Interaction)

At the rental pickup location, the customer enters their `booking_id`. This triggers the upselling process powered by a D‑ID live avatar.

### **1. Generating the Conversation Script**

Based on the user's profile, we generate:

* **Which upgrade to propose**
* **Which protection insurance to offer**
* **How to phrase the offer** (tone, reasoning, emotional angle, etc.)

### **2. Conversation Outline**

The avatar follows a controlled conversation structure:

#### **Upsell Phase (Car Upgrade)**

1. "Hi *Name*, welcome to SiXT. You originally booked *CAR*, but unfortunately that exact model is not available. However, you're lucky — we have a special offer today: for only *XX* more, you can upgrade to *YY*."

2. Customer responses:

   * **Yes** → "Fantastic, great choice."
   * **No** → "I understand. I'll offer a similar car at the same price — we have *TT* available. Does that work?"

     * If yes → move to insurance
     * If no → connect to a real sales agent
   * **Needs more info** → escalate to real sales agent

#### **Protection Insurance Phase**

We propose an insurance option tailored to the user profile.

Customer responses:

* **Yes** → "Fantastic! You can now pick up your key from the box."
* **No** → "No problem. You can pick up your key from the box."
* **Other / confused** → connect to real sales agent