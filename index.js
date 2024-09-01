document.addEventListener('DOMContentLoaded', () => {
    const peer = new Peer();
    const peerIdInput = document.getElementById('peer-id');
    const connectIdInput = document.getElementById('connect-id');
    const connectButton = document.getElementById('connect-button');
    const fileInput = document.getElementById('file-input');
    const sendButton = document.getElementById('send-button');
    const fileTransferSection = document.getElementById('file-transfer-section');
    const status = document.getElementById('status');
    const fileList = document.getElementById('file-list');
    const progressBar = document.getElementById('progress-bar');
    const progress = document.getElementById('progress');

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
                const chunkSize = 1024 * 1024; // 1MB chunks
                let offset = 0;
        
                const reader = new FileReader();
        
                reader.onload = async (event) => {
                    conn.send({
                        fileName: file.name,
                        fileData: event.target.result,
                        fileSize: file.size,
                        isLastChunk: (offset + chunkSize >= file.size)
                    });
        
                    offset += chunkSize;
        
                    // Update the progress bar
                    const percent = Math.min((offset / file.size) * 100, 100);
                    progress.style.width = percent + '%';
        
                    if (offset < file.size) {
                        await new Promise(resolve => setTimeout(resolve, 10)); // Pausa de 10ms entre envios
                        readSlice(offset);
                    } else {
                        status.textContent = 'File sent: ' + file.name;
                        setTimeout(() => {
                            progressBar.classList.add('hidden'); // Esconde a barra após a conclusão
                        }, 500);
                    }
                };
        
                const readSlice = (o) => {
                    const slice = file.slice(o, o + chunkSize);
                    reader.readAsArrayBuffer(slice);
                };
        
                progressBar.classList.remove('hidden'); // Mostra a barra de progresso
                progress.style.width = '0%';
                readSlice(0);
            } else {
                status.textContent = 'No file selected or not connected';
            }
        });        

        // Handle receiving chunks and assembling them
        let incomingFileData = [];
        let incomingFileName = '';
        let incomingFileSize = 0;
        let receivedSize = 0;

        conn.on('data', (data) => {
            if (data.fileName && data.fileData) {
                if (receivedSize === 0) {
                    incomingFileName = data.fileName;
                    incomingFileSize = data.fileSize;
                    
                    // Mostra a barra de progresso
                    progressBar.classList.remove('hidden');
                    progress.style.width = '0%';
                    progress.style.height = '100%'; // Garantir que a altura esteja correta
                    
                }

                receivedSize += data.fileData.byteLength;
                incomingFileData.push(data.fileData);

                // Update the progress bar
                const percent = Math.min((receivedSize / incomingFileSize) * 100, 100);
                progress.style.width = percent + '%';

                if (data.isLastChunk) {
                    // Create a Blob from the received chunks
                    const blob = new Blob(incomingFileData);

                    // Create a URL for the Blob
                    const url = URL.createObjectURL(blob);

                    // Create a list item with a download button
                    const li = document.createElement('li');
                    const span = document.createElement('span');
                    span.textContent = incomingFileName;
                    span.className = 'mr-2';
                    const button = document.createElement('button');
                    button.className = 'btn btn-accent';
                    button.textContent = 'Download';
                    button.onclick = () => {
                        const a = document.createElement('a');
                        a.href = url;
                        a.download = incomingFileName;
                        document.body.appendChild(a);
                        a.click();
                        document.body.removeChild(a);
                        URL.revokeObjectURL(url);
                    };
                    li.appendChild(span);
                    li.appendChild(button);
                    fileList.appendChild(li);

                    status.textContent = 'File received: ' + incomingFileName;
                    setTimeout(() => {
                        progressBar.classList.add('hidden'); // Esconde a barra após a conclusão
                    }, 500);

                    // Reset for the next file
                    incomingFileData = [];
                    receivedSize = 0;
                }
            }
        });
    }
});
