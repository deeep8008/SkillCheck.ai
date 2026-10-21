require("dotenv").config();
const app = require("./src/app");
const database = require("./src/config/database");

database.connectDB();


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});