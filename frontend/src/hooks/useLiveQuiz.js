import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'

export function useLiveQuiz(quizId, { onParticipantsChange, onAnswersChange, onQuizChange, enabled = true }) {
  const callbacksRef = useRef({ onParticipantsChange, onAnswersChange, onQuizChange })

  useEffect(() => {
    callbacksRef.current = { onParticipantsChange, onAnswersChange, onQuizChange }
  }, [onParticipantsChange, onAnswersChange, onQuizChange])

  useEffect(() => {
    if (!quizId || !enabled) return

    const participantsChannel = supabase
      .channel(`quiz-participants-${quizId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'quiz_participants',
        filter: `quiz_id=eq.${quizId}`,
      }, () => {
        callbacksRef.current.onParticipantsChange?.()
      })
      .subscribe()

    const answersChannel = supabase
      .channel(`quiz-answers-${quizId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'answers',
        filter: `quiz_id=eq.${quizId}`,
      }, () => {
        callbacksRef.current.onAnswersChange?.()
      })
      .subscribe()

    const quizChannel = supabase
      .channel(`quiz-status-${quizId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'quizzes',
        filter: `id=eq.${quizId}`,
      }, (payload) => {
        callbacksRef.current.onQuizChange?.(payload.new)
      })
      .subscribe()

    return () => {
      supabase.removeChannel(participantsChannel)
      supabase.removeChannel(answersChannel)
      supabase.removeChannel(quizChannel)
    }
  }, [quizId, enabled])
}
