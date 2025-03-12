require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT || 5000;
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');


const client = new DynamoDBClient();
const documentClient = DynamoDBDocumentClient.from(client);

async function getUser() {
    try {
        const command = new GetCommand({
            TableName: 'Ticket-System',
            Key: { ID: '1234', CreatedAt: 'today' } 
        });

        const data = await documentClient.send(command);
        console.log("User Data:", data.Item);
    } catch (error) {
        console.error("Error fetching user:", error);
    }
}


getUser();

app.use(express.json());

app.get('/', (req, res) => {
    res.send('Reimbursement System API is running...');
});

app.listen(port, () => {
    console.log(`Server running on http://localhost:${port}`);
});