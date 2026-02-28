import {App, Modal, Notice} from 'obsidian';
import {convertAudioToFloat32, formatTime} from './audio-utils';

export class RecordingModal extends Modal {
	private mediaRecorder: MediaRecorder | null = null;
	private audioChunks: Blob[] = [];
	private isRecording = false;
	private recordingTime = 0;
	private timerInterval: number | null = null;
	private maxDuration: number;
	private onTranscribe: (audio: Float32Array) => Promise<void>;
	
	private recordButton: HTMLButtonElement;
	private stopButton: HTMLButtonElement;
	private timerElement: HTMLElement;
	private statusElement: HTMLElement;

	constructor(
		app: App,
		maxDuration: number,
		onTranscribe: (audio: Float32Array) => Promise<void>
	) {
		super(app);
		this.maxDuration = maxDuration;
		this.onTranscribe = onTranscribe;
	}

	onOpen() {
		const {contentEl} = this;
		contentEl.empty();
		
		contentEl.createEl('h2', {text: 'Record audio'});
		
		this.statusElement = contentEl.createEl('div', {
			cls: 'whisper-status',
			text: 'Ready to record'
		});
		
		this.timerElement = contentEl.createEl('div', {
			cls: 'whisper-timer',
			text: '0:00'
		});
		
		const buttonContainer = contentEl.createEl('div', {cls: 'whisper-buttons'});
		
		this.recordButton = buttonContainer.createEl('button', {
			text: 'Start recording',
			cls: 'mod-cta'
		});
		this.recordButton.addEventListener('click', () => {
			void this.startRecording();
		});
		
		this.stopButton = buttonContainer.createEl('button', {
			text: 'Stop & transcribe',
			cls: 'mod-warning'
		});
		this.stopButton.disabled = true;
		this.stopButton.addEventListener('click', () => this.stopRecording());
		
		const cancelButton = buttonContainer.createEl('button', {
			text: 'Cancel'
		});
		cancelButton.addEventListener('click', () => this.close());
	}

	async startRecording() {
		try {
			const stream = await navigator.mediaDevices.getUserMedia({audio: true});
			
			this.audioChunks = [];
			this.mediaRecorder = new MediaRecorder(stream);
			
			this.mediaRecorder.ondataavailable = (event) => {
				if (event.data.size > 0) {
					this.audioChunks.push(event.data);
				}
			};
			
			this.mediaRecorder.onstop = async () => {
				stream.getTracks().forEach(track => track.stop());
				await this.processRecording();
			};
			
			this.mediaRecorder.start();
			this.isRecording = true;
			this.recordingTime = 0;
			
			this.recordButton.disabled = true;
			this.stopButton.disabled = false;
			this.statusElement.setText('Recording...');
			
			this.timerInterval = window.setInterval(() => {
				this.recordingTime++;
				this.timerElement.setText(formatTime(this.recordingTime));
				
				if (this.recordingTime >= this.maxDuration) {
					this.stopRecording();
					new Notice(`Maximum recording duration (${this.maxDuration}s) reached`);
				}
			}, 1000);
			
		} catch (error) {
			new Notice('Failed to access microphone. Please grant microphone permissions.');
			console.error('Microphone access error:', error);
		}
	}

	stopRecording() {
		if (this.mediaRecorder && this.isRecording) {
			this.mediaRecorder.stop();
			this.isRecording = false;
			
			if (this.timerInterval) {
				clearInterval(this.timerInterval);
				this.timerInterval = null;
			}
			
			this.recordButton.disabled = false;
			this.stopButton.disabled = true;
			this.statusElement.setText('Processing...');
		}
	}

	async processRecording() {
		try {
			const audioBlob = new Blob(this.audioChunks, {type: 'audio/webm'});
			
			this.statusElement.setText('Converting audio...');
			const audioData = await convertAudioToFloat32(audioBlob);
			
			this.statusElement.setText('Transcribing...');
			await this.onTranscribe(audioData);
			
			this.close();
		} catch (error) {
			new Notice('Failed to process recording');
			console.error('Recording processing error:', error);
			this.statusElement.setText('Error processing recording');
			this.recordButton.disabled = false;
		}
	}

	onClose() {
		if (this.isRecording) {
			this.stopRecording();
		}
		
		if (this.timerInterval) {
			clearInterval(this.timerInterval);
		}
		
		const {contentEl} = this;
		contentEl.empty();
	}
}
