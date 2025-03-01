import axios from "axios";

export default class Note {
    constructor(token) {
        this.token = token;
        this.name = this.generateNote();
    }

    async generateNote() {
        try {
            const response = await axios.post(
                "http://localhost:9001/api/1.3.0/createPad",
                {
                    padID: "testpad",
                    text: "hu",
                },
                {
                    headers: { "Authorization": token }
                }
            );
            console.log(response);
            return response.data;
        } catch (error) {
            console.error();
            return "";
        }


    }
}