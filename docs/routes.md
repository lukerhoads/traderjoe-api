# Routes

All of the routes with example responses and how to query the data through code.

## Response Structure

All responses are formatted in a similar way. First, you have the data element. This is where the content of the response is stored. The second part, `status`, is response metadata used to display user friendly errors and help with debugging.

Example:

```json
{
    "data": "10910131.81947572910",
    "status": {
        "timestamp": 1642289435
    }
}
```

Example error:

```json
{
    "data": null,
    "status": {
        "timestamp": 1642289435,
        "error_code": 400,
        "error_message": "Invalid pool address provided."
    }
}
```
