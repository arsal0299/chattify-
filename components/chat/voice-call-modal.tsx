'use client'

import { useState, useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Volume2, VolumeX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Dialog,
  DialogContent,
} from '@/components/ui/dialog'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Profile {
  id: string
  username: string
  email: string
  avatar_url?: string
  status?: string
}

interface VoiceCallModalProps {
  open: boolean
  onClose: () => void
  caller: Profile
  receiver: Profile
}

export function VoiceCallModal({ open, onClose, caller, receiver }: VoiceCallModalProps) {
  const [callStatus, setCallStatus] = useState<'connecting' | 'ringing' | 'connected' | 'ended'>('connecting')
  const [callDuration, setCallDuration] = useState(0)
  const [isMuted, setIsMuted] = useState(false)
  const [isSpeakerOn, setIsSpeakerOn] = useState(true)
  const [callId, setCallId] = useState<string | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const supabase = createClient()

  useEffect(() => {
    if (open) {
      initializeCall()
    }

    return () => {
      cleanupCall()
    }
  }, [open])

  const initializeCall = async () => {
    try {
      // Create call record
      const { data: call, error } = await supabase
        .from('calls')
        .insert({
          caller_id: caller.id,
          receiver_id: receiver.id,
          call_type: 'voice',
          status: 'pending',
        })
        .select()
        .single()

      if (error) throw error
      setCallId(call.id)

      // Request microphone permission
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
        localStreamRef.current = stream
        
        setCallStatus('ringing')
        
        // Simulate call connection after 2 seconds (in real app, use WebRTC signaling)
        setTimeout(() => {
          if (callStatus !== 'ended') {
            setCallStatus('connected')
            startTimer()
            updateCallStatus(call.id, 'connected')
          }
        }, 2000)
      } catch (mediaError) {
        console.error('Microphone access denied:', mediaError)
        toast.error('Microphone access is required for voice calls')
        handleEndCall()
      }
    } catch (err) {
      console.error('Failed to initialize call:', err)
      toast.error('Failed to start call')
      onClose()
    }
  }

  const updateCallStatus = async (id: string, status: string) => {
    await supabase
      .from('calls')
      .update({ 
        status,
        ...(status === 'connected' && { started_at: new Date().toISOString() }),
        ...(status === 'ended' && { ended_at: new Date().toISOString() }),
      })
      .eq('id', id)
  }

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setCallDuration((prev) => prev + 1)
    }, 1000)
  }

  const cleanupCall = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    setCallDuration(0)
    setCallStatus('connecting')
    setIsMuted(false)
    setIsSpeakerOn(true)
  }

  const handleEndCall = async () => {
    setCallStatus('ended')
    
    if (callId) {
      await updateCallStatus(callId, 'ended')
    }

    cleanupCall()
    onClose()
  }

  const toggleMute = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0]
      if (audioTrack) {
        audioTrack.enabled = isMuted
        setIsMuted(!isMuted)
      }
    }
  }

  const toggleSpeaker = () => {
    setIsSpeakerOn(!isSpeakerOn)
    // In a real app, you would route audio to speaker/earpiece here
  }

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase()
  }

  const getStatusText = () => {
    switch (callStatus) {
      case 'connecting':
        return 'Connecting...'
      case 'ringing':
        return 'Ringing...'
      case 'connected':
        return formatDuration(callDuration)
      case 'ended':
        return 'Call Ended'
      default:
        return ''
    }
  }

  return (
    <Dialog open={open} onOpenChange={() => handleEndCall()}>
      <DialogContent className="sm:max-w-md bg-gradient-to-b from-primary/20 to-background border-none">
        <div className="flex flex-col items-center py-8">
          {/* Caller Avatar with Pulse Animation */}
          <div className="relative mb-6">
            {callStatus === 'ringing' && (
              <>
                <div className="absolute inset-0 rounded-full bg-primary/30 pulse-ring" />
                <div className="absolute inset-0 rounded-full bg-primary/20 pulse-ring" style={{ animationDelay: '0.5s' }} />
              </>
            )}
            <Avatar className="w-28 h-28 border-4 border-primary/30">
              <AvatarFallback className="bg-primary text-primary-foreground text-3xl font-bold">
                {getInitials(receiver.username)}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Contact Name */}
          <h2 className="text-2xl font-bold text-foreground mb-2">
            {receiver.username}
          </h2>

          {/* Call Status */}
          <p className="text-muted-foreground mb-8">
            {getStatusText()}
          </p>

          {/* Call Controls */}
          <div className="flex items-center gap-6">
            {/* Mute Button */}
            <Button
              variant="outline"
              size="icon"
              className={`w-14 h-14 rounded-full ${isMuted ? 'bg-destructive/20 border-destructive' : ''}`}
              onClick={toggleMute}
              disabled={callStatus !== 'connected'}
            >
              {isMuted ? (
                <MicOff className="w-6 h-6 text-destructive" />
              ) : (
                <Mic className="w-6 h-6" />
              )}
            </Button>

            {/* End Call Button */}
            <Button
              variant="destructive"
              size="icon"
              className="w-16 h-16 rounded-full"
              onClick={handleEndCall}
            >
              <PhoneOff className="w-7 h-7" />
            </Button>

            {/* Speaker Button */}
            <Button
              variant="outline"
              size="icon"
              className={`w-14 h-14 rounded-full ${!isSpeakerOn ? 'bg-muted' : ''}`}
              onClick={toggleSpeaker}
              disabled={callStatus !== 'connected'}
            >
              {isSpeakerOn ? (
                <Volume2 className="w-6 h-6" />
              ) : (
                <VolumeX className="w-6 h-6" />
              )}
            </Button>
          </div>

          {/* Call Quality Indicator */}
          {callStatus === 'connected' && (
            <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
              <div className="flex gap-0.5">
                <div className="w-1 h-2 bg-[var(--online-status)] rounded-full" />
                <div className="w-1 h-3 bg-[var(--online-status)] rounded-full" />
                <div className="w-1 h-4 bg-[var(--online-status)] rounded-full" />
                <div className="w-1 h-3 bg-[var(--online-status)] rounded-full" />
              </div>
              <span>Good Connection</span>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
