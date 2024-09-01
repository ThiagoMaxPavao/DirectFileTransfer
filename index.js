document.addEventListener('DOMContentLoaded', () => {
    const peer = new Peer();
    const peerIdInput = document.getElementById('peer-id');
    const connectIdInput = document.getElementById('connect-id');
    const connectButton = document.getElementById('connect-button');
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const fileTransferSection = document.getElementById('file-transfer-section');
    const status = document.getElementById('status');

    let conn;

    // Display the Peer ID once it's generated
    peer.on('open', (id) => {
        peerIdInput.value = id;
    });

    // Handle incoming connection requests
    peer.on('connection', (connection) => {
        conn = connection;
        setupConnection();
    });

    // Handle outgoing connection requests
    connectButton.addEventListener('click', () => {
        const peerId = connectIdInput.value;
        if (peerId) {
            conn = peer.connect(peerId);
            conn.on('open', () => {
                setupConnection();
            });
        }
    });

    function setupConnection() {
        // Show the file transfer section and notify both peers
        fileTransferSection.classList.remove('hidden');
        status.textContent = 'Connected to ' + conn.peer;

        // Enable both peers to send files
        sendButton.addEventListener('click', () => {
            const file = fileInput.files[0];
            if (file && conn.open) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    const data = {
                        fileName: file.name,
                        fileData: event.target.result
                    };
                    conn.send(data);
                    status.textContent = 'File sent: ' + file.name;
                };
                reader.readAsArrayBuffer(file);
            } else {
                status.textContent = 'No file selected or not connected';
            }
        });

        // Handle receiving files
        conn.on('data', (data) => {
            if (data.fileName && data.fileData) {
                // Create a Blob from the received ArrayBuffer
                const blob = new Blob([data.fileData]);

                // Create a URL for the Blob
                const url = URL.createObjectURL(blob);

                // Create a link element and trigger a download
                const a = document.createElement('a');
                a.href = url;
                a.download = data.fileName;
                document.body.appendChild(a);
                a.click();

                // Clean up by removing the link element
                document.body.removeChild(a);

                // Release the object URL
                URL.revokeObjectURL(url);

                status.textContent = 'File received: ' + data.fileName;
            }
        });
    }
});
