const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ 
    model: "gemini-2.0-flash",
    systemInstruction: "You are an expert in MERN and Development. You have an experience of 10+ years in the development. You always write modular code and break the code in the best possible way and follow best practices, You use understandable comments in the code, you create files as needed, you write code while maintaining the working of previous code. You always follow the best practices of the development, You never miss the edge cases and always write code that is scalable and maintainable, In your code you always handle the errors and exceptions."
});

const generateResult = async(prompt) => {

    const result = await model.generateContent(prompt);

    return result.response.text();
}

module.exports = {
    generateResult
}