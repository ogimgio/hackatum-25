import { BackendSessionData, BookingContext, FlowState } from './types';

// --- 1. Initial Data Setup (Fetches from your FastAPI) ---
export const getInitialOffers = async (booking: BookingContext): Promise<BackendSessionData> => {

    try {
        // 1. Construct the payload exactly as your Python script expects
        const payload = {
            client: booking.client,
            reservation: {
                pickup_location_id: booking.reservation.pickup_location_id,
                // We send the car the user JUST selected as the "preferred_car"
                preferred_car: booking.selectedCar?.name || "Any"
            },
            preferences: booking.preferences,
            addons: booking.addons,
            meta: booking.meta
        };

        console.log("📤 Sending to Backend:", JSON.stringify(payload, null, 2));

        // 2. Call your FastAPI Endpoint
        const response = await fetch('http://localhost:8000/api/booking/offer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.statusText}`);
        }

        const apiData = await response.json();
        console.log("📥 Received from Backend:", apiData);

        // 3. Map the API response to your App's Data Structure
        // Note: Your API returns 'price_delta' string directly, which is perfect for display.

        return {
            upsell_car: {
                id: apiData.upsell_car.id,
                name: apiData.upsell_car.name,
                image: apiData.upsell_car.image,
                // We set raw price to 0 because your API gives us the formatted string directly
                price: 0,
                price_display: apiData.upsell_car.price_delta,
                features: ['Premium', 'Upgrade'], // Your API doesn't return features yet, so we add generic tags
                description: apiData.upsell_car.description
            },
            normal_car: {
                id: apiData.normal_car.id,
                name: apiData.normal_car.name,
                image: apiData.normal_car.image,
                price: 0,
                price_display: apiData.normal_car.price_delta, // likely "Same Price"
                features: ['Standard', 'Selected'],
                description: apiData.normal_car.description
            },
            protection: {
                name: apiData.protection.name,
                price: apiData.protection.price,
                description: apiData.protection.description
            }
        };

    } catch (error) {
        console.error("❌ Failed to fetch offers from backend:", error);

        // Fallback / Crash Protection (Optional: Return a hardcoded safe default so app doesn't break)
        // In production you might want to throw error to show the Error Screen
        return {
            upsell_car: { id: 'error', name: 'Premium Upgrade', image: '', price: 0, price_display: '+$20', features: [], description: '' },
            normal_car: { id: 'error', name: 'Your Selection', image: '', price: 0, price_display: 'Included', features: [], description: '' },
            protection: { name: 'Full Protection', price: '+$15', description: 'Full coverage.' }
        };
    }
};

/// --- 2. The Logic Brain (Simulates your Python Backend) ---
export const processUserResponse = async (
    currentState: FlowState,
    userText: string,
    sessionData: BackendSessionData,
    openAIKey: string
): Promise<{ nextState: FlowState; agentScript: string }> => {

    // 1. Updated Prompt: We tell the LLM specifically how to handle "Not Sure" vs "Escalate"
    const systemPrompt = `
    You are a car rental booking assistant.
    Current State: ${currentState}
    
    Your Goal: Classify the user's intent based on their response.
    
    Return a JSON object with:
    - "intent": "POSITIVE" | "NEGATIVE" | "ESCALATE" | "UNCLEAR"
    
    Rules for Classification:
    1. POSITIVE: User agrees, says yes, or accepts the offer.
    2. NEGATIVE: User declines, says no, or prefers the previous option.
    3. ESCALATE: User **explicitly** asks for a "human", "agent", "representative", "manager", or says "talk to someone else".
    4. UNCLEAR: User asks a question, gives an ambiguous answer, or says something unrelated. (Do NOT escalate for this, we will ask them again).
    `;

    try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${openAIKey}` },
            body: JSON.stringify({
                model: 'gpt-4o',
                response_format: { type: "json_object" },
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userText }
                ]
            })
        });

        const data = await response.json();
        const result = JSON.parse(data.choices[0].message.content);
        const intent = result.intent;

        console.log(`User Intent: ${intent} | State: ${currentState}`);

        // --- GLOBAL ESCALATION CHECK ---
        // Only happens if user EXPLICITLY asks for it
        if (intent === 'ESCALATE') {
            return { nextState: 'ESCALATED', agentScript: "I understand. I'm connecting you to a human specialist right now. Please hold." };
        }

        // --- RETRY LOOP (Handle "Unclear" / Questions) ---
        // If we don't understand, we stay on the SAME state and ask again politely.
        if (intent === 'UNCLEAR') {
            let retryScript = "I didn't quite catch that.";

            if (currentState === 'UPSELL_OFFER') {
                retryScript = `I'm sorry, I didn't understand. Would you like to upgrade to the ${sessionData.upsell_car.name} for just ${sessionData.upsell_car.price_display}?`;
            } else if (currentState === 'NORMAL_OFFER') {
                retryScript = `Sorry, was that a yes for the ${sessionData.normal_car.name}?`;
            } else if (currentState === 'PROTECTION_OFFER') {
                retryScript = "I missed that. Do you want to add the Platinum Protection for peace of mind?";
            }

            return {
                nextState: currentState, // <--- STAY ON CURRENT STATE
                agentScript: retryScript
            };
        }

        // --- NORMAL FLOW (Positive / Negative) ---

        // 1. UPSELL PHASE
        if (currentState === 'UPSELL_OFFER') {
            if (intent === 'POSITIVE') {
                return {
                    nextState: 'PROTECTION_OFFER',
                    agentScript: `Great choice! Now, for peace of mind, we recommend ${sessionData.protection.name}. It covers everything for ${sessionData.protection.price} dollars a day. Shall we add it?`
                };
            }
            if (intent === 'NEGATIVE') {
                return {
                    nextState: 'NORMAL_OFFER',
                    agentScript: `No problem. In that case, I can offer you a ${sessionData.normal_car.name} at your original budget. Does that work for you?`
                };
            }
        }

        // 2. NORMAL CAR PHASE (Backup)
        if (currentState === 'NORMAL_OFFER') {
            if (intent === 'POSITIVE') {
                return {
                    nextState: 'PROTECTION_OFFER',
                    agentScript: "Excellent. To stay safe, we propose our Platinum Protection. Zero excess. Shall I include it?"
                };
            }
            // If they reject the backup car, we essentially have nothing left, so we escalate or say goodbye.
            return { nextState: 'ESCALATED', agentScript: "I apologize, but I don't have other cars available. Let me get a manager to help you find a solution." };
        }

        // 3. PROTECTION PHASE
        if (currentState === 'PROTECTION_OFFER') {
            if (intent === 'POSITIVE') {
                return { nextState: 'COMPLETED', agentScript: "Perfect! Your car is protected. You can pick up your keys from Box number 4. Safe travels!" };
            }
            if (intent === 'NEGATIVE') {
                return { nextState: 'COMPLETED', agentScript: "Understood, standard coverage only. Your keys are in Box number 4. Drive safely!" };
            }
        }

        // Default Fallback (Should rarely be reached due to UNCLEAR handling)
        return {
            nextState: currentState,
            agentScript: "Could you please repeat that? I want to make sure I get your booking right."
        };

    } catch (e) {
        console.error("AI Error", e);
        return { nextState: 'ESCALATED', agentScript: "I'm having a little trouble connecting. Let me pass you to a human agent." };
    }
};