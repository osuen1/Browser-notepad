# Notepad for the web browser

This project, as the name implies, is a notebook consisting of two pages: 
- the page that is used to record notes (it is also a bootable page)(page 1)
- a page that displays a list of notes (we'll call it page 2)

## The logic of the 1st page
There is a field for entering notes on the main page. After clicking the **Save Case** button, a POST request is sent to the server containing JSON, which encodes the full date of sending the request and, in fact, the text that the user entered. Then, this JSON is decrypted by the server and the text entered by the user is saved to a global array, which is then used to display the to-do list that the user entered on the second page of the site. 
## The logic of the 2nd page
The second page contains a button that launches the following algorithm:
- the client sends a GET request to the server
- the server receives a GET request and sends a POST request containing JSON
- the client receives and decodes the POST request, and then inserts it into the list `<ul>`

## Conclusion
Yes, this project is not perfect, especially because it does not have a database, but uses an array instead. In the future, this will be corrected.