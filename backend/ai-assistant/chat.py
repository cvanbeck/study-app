from fastapi import FastAPI, Request, HTTPException
from fastapi.responses import StreamingResponse
import httpx
import asyncio
import json

#Initialize FastAPI app
app = FastAPI()

#This function will read the response from the external API in chunks and yield them asynchronously.
async def stream_response(response):
    async for chunk in response.aiter_bytes():  #Iterates over response chunks
        yield chunk  #Sends each chunk to the user as it arrives

#Define an API endpoint for processing messages
@app.post("/chat")
async def chat(request: Request):
    try:
        #Parse JSON body from the incoming request
        body = await request.json()
        prompt = body.get("prompt")  #Extract the prompt from the JSON

        #Validate the prompt input
        if not prompt:
            raise HTTPException(status_code=400, detail="Prompt is required")  #Return 400 error if prompt is missing

        #Call the AI API asynchronously
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://ai.api.parsonlabs.com/v1/chat/completions",  #Just copied these details from Will
                json={
                    "model": "deepseek-r1:1.5b",  
                    "messages": [{"role": "user", "content": prompt}],  
                    "stream": True,
                },
                headers={"Content-Type": "application/json"}, 
                timeout=30.0
            )

            #If the external API request fails, raise an HTTP exception with details
            if response.status_code != 200:
                error_body = response.json()  #Extract error details from response
                raise HTTPException(status_code=response.status_code, detail=f"ParsonLabs API Error: {error_body}")

            #Return the streamed response to the user
            return StreamingResponse(stream_response(response), media_type="text/event-stream")

    except Exception as e:
        #Catch any unexpected errors and return a 500 Internal Server Error response
        return HTTPException(status_code=500, detail=f"Internal Server Error: {str(e)}")
