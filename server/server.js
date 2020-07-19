//import building an express app and invoke it
const express = require("express");
const app = express();
//import routes
const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/user");
//use to see the endpoints and status codes in our console
const morgan = require("morgan");
const cors = require("cors");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
//to use environment variables
require("dotenv").config();

//connect to db
mongoose
  .connect(process.env.DATABASE, {
    useNewUrlParser: true,
    useFindAndModify: false,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(() => console.log("Successfully connected to the DB"))
  .catch((err) => console.log("DB Connection Error: ", err));

//middleware
//app middlewares
app.use(morgan("dev"));
app.use(bodyParser.json());
//allows all origins to make request to our server -- now configured to only 3000 for dev
if ((process.env.NODE_ENV = "development")) {
  app.use(cors({ origin: `http://localhost:3000` }));
}

//passing the default parameter as well
app.use("/api", authRoutes);
app.use("/api", userRoutes);

//choosing the port
const port = process.env.PORT || 8000;

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
