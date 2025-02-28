require('dotenv').config();
const mongoose = require('mongoose');

if (process.argv.length < 3) {
    console.log('Give password as argument');
    process.exit(1);
}

const name = process.argv[2];
const number = process.argv[3];

const url = process.env.MONGODB_URI;

if (!url) {
    console.error('MongoDB URI is missing from environment variables');
    process.exit(1);
}

mongoose.set('strictQuery', false);

mongoose
    .connect(url)
    .then(() => {
        console.log('Connected to MongoDB');

        const personSchema = new mongoose.Schema({
            name: String,
            number: String,
        });

        const Person = mongoose.model('Person', personSchema);

        if (name && number) {
            const person = new Person({ name, number });

            return person
                .save()
                .then(() => {
                    console.log(`Added ${name}'s number, ${number} to phonebook`);
                    mongoose.connection.close();
                })
                .catch((error) => {
                    console.error('Error saving person:', error);
                    mongoose.connection.close();
                });
        } else {
            return Person.find({}).then((result) => {
                console.log('Phonebook:');
                result.forEach((person) => console.log(`${person.name} ${person.number}`));
                mongoose.connection.close();
            });
        }
    })
    .catch((error) => {
        console.error('Error connecting to MongoDB:', error);
        mongoose.connection.close();
    });
