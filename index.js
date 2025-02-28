const express = require('express');
const morgan = require('morgan');
const mongoose = require('mongoose');
require('dotenv').config();
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;
const url = process.env.MONGODB_URI;

// Middleware setup
app.use(cors());
app.use(express.json());
app.use(express.static('dist'));
app.use(morgan('tiny'));

// MongoDB connection
mongoose
    .connect(url)
    .then(() => {
        console.log('Connected to MongoDB');
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error.message);
    });

// Schema and Model for Person
const personSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        minlength: 3,
    },
    number: {
        type: String,
        required: true,
        validate: {
            validator: (value) => {
                // Check if the number matches the pattern of having 2 or 3 digits, a hyphen, and then at least 5 digits
                return /^\d{2,3}-\d{5,}$/.test(value);
            },
            message: (props) =>
                `${props.value} is not a valid phone number! e.g., 09-1234556 and 040-22334455 are valid phone numbers`,
        },
    },
});

personSchema.set('toJSON', {
    transform: (document, returnedObject) => {
        returnedObject.id = returnedObject._id.toString();
        delete returnedObject._id;
        delete returnedObject.__v;
    },
});

const Person = mongoose.model('Person', personSchema);

// Error handling middleware
const errorHandler = (error, req, res, next) => {
    console.error(error.message);

    if (error.name === 'CastError' && error.kind === 'ObjectId') {
        return res.status(400).send({ error: 'Malformatted ID' });
    } else if (error.name === 'ValidationError') {
        return res.status(400).json({ error: error.message });
    }

    next(error);
};

// Routes
app.get('/api/persons', (req, res, next) => {
    Person.find({})
        .then((persons) => res.json(persons))
        .catch((error) => next(error));
});

app.get('/api/persons/:id', (req, res, next) => {
    Person.findById(req.params.id)
        .then((person) => {
            if (person) {
                res.json(person);
            } else {
                res.status(404).end();
            }
        })
        .catch((error) => next(error));
});

app.post('/api/persons', (req, res, next) => {
    const { name, number } = req.body;

    if (!name || !number) {
        return res.status(400).json({ error: 'Name or number is missing' });
    }

    const person = new Person({ name, number });

    person
        .save()
        .then((savedPerson) => res.json(savedPerson))
        .catch((error) => next(error));
});

app.put('/api/persons/:id', (req, res, next) => {
    const { name, number } = req.body;

    const opts = { runValidators: true, new: true };

    Person.findByIdAndUpdate(req.params.id, { name, number }, opts)
        .then((updatedPerson) => {
            if (updatedPerson) {
                res.json(updatedPerson);
            } else {
                res.status(404).end();
            }
        })
        .catch((error) => next(error));
});

app.delete('/api/persons/:id', (req, res, next) => {
    Person.findByIdAndDelete(req.params.id)
        .then((result) => {
            if (result) {
                res.status(204).end();
            } else {
                res.status(404).json({ error: 'Person not found' });
            }
        })
        .catch((error) => next(error));
});

// Unknown endpoint middleware
app.use((req, res) => {
    res.status(404).send({ error: 'Unknown endpoint' });
});

app.use(errorHandler);

// Start server
app.listen(PORT, () => {
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
    console.log(`Server running on ${protocol}://localhost:${PORT}`);
});
