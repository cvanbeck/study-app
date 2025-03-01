import axios from "axios";

export default class Note {
    constructor(padName) {
        this.token = "0046013d69a1e2ac718b1ac01d69bd041c1168a36b822dac6a08d41db3003b18";
        this.name = this.generateNote(padName);
    }

    async generateNote(padName) {
        try {
            const response = await axios.post(
                "http://localhost:9001/api/1.3.0/createPad",
                {
                    padID: padName,
                },
                {
                    headers: { "Authorization": this.token }
                }
            );
            return padName;
        } catch (error) {
            console.error(error);
            return "";
        }


    }
}