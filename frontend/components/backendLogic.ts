import { BackendSessionData, BookingContext, FlowState } from './types';

// Update the argument type to BookingContext
export const getInitialOffers = (booking: BookingContext): BackendSessionData => {

    // 1. The car they selected in the previous screen
    const selectedCar = booking.selectedCar || {
        id: 'vw_golf', name: 'VW Golf', price: 35, image: '', price_display: '$35', features: []
    };

    // 2. Define a static Upsell (BMW X5)
    // In a real app, you would find a car 1 tier higher than selectedCar
    const upsellCar = {
        id: 'bmw_x5',
        name: 'BMW X5 Series',
        image: 'https://di-uploads-pod16.dealerinspire.com/bmwofweststlouis/uploads/2019/09/2020-BMW-X5-sDrive40i-White-Side-View.png',
        price: 60,
        price_display: '+$25/day', // Hardcoded delta for demo
        features: ['Luxury', 'Heated Seats'],
        description: `Special upgrade for ${booking.client.name}.`
    };

    return {
        upsell_car: upsellCar,
        normal_car: selectedCar, // <--- This ensures the Agent knows what we picked
        protection: {
            name: 'Platinum Protection',
            price: '+$15/day',
            description: 'Zero excess, tire & glass coverage included.'
        }
    };
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
                retryScript = `I'm sorry, I didn't understand. Would you like to upgrade to the ${sessionData.upsell_car.name} for just ${sessionData.upsell_car.price_delta}?`;
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
                    agentScript: "Great choice! Now, for peace of mind, we recommend Platinum Protection. It covers everything for 15 dollars a day. Shall we add it?"
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